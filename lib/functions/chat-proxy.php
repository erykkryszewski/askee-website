<?php

if (!defined("ABSPATH")) {
    exit();
}

define("ASKEE_CHAT_SESSION_RATE_LIMIT_MAX_MESSAGES", 25);
define("ASKEE_CHAT_SESSION_RATE_LIMIT_WINDOW_SECONDS", 1800);

// 1.2 REJESTRUJE ENDPOINT, jak ktoś zrobi POST na wp-json/askee/v1/chat to odpala sie callback
add_action("rest_api_init", function () {
    register_rest_route("askee/v1", "/chat", [
        "methods" => "POST",
        "callback" => "askee_chat_proxy_callback",
        "permission_callback" => "__return_true",
    ]);
});

// pobiera aktywne id sesji albo probuje uruchomic sesje i je zwrocic
function askee_chat_get_or_start_session_id() {
    if (!function_exists("session_status") || !function_exists("session_id")) {
        return "";
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        $active_session_id = session_id();
        return is_string($active_session_id) ? $active_session_id : "";
    }

    if (
        session_status() === PHP_SESSION_NONE &&
        !headers_sent() &&
        function_exists("session_start")
    ) {
        $started = @session_start();
        if ($started && session_status() === PHP_SESSION_ACTIVE) {
            $started_session_id = session_id();
            return is_string($started_session_id) ? $started_session_id : "";
        }
    }

    $fallback_session_id = session_id();
    return is_string($fallback_session_id) ? $fallback_session_id : "";
}

// zwraca domyslny stan licznika rate limitu dla sesji
function askee_chat_get_default_session_rate_limit_state() {
    return [
        "window_started_at_timestamp" => 0,
        "messages_sent_in_window_count" => 0,
        "blocked_until_timestamp" => 0,
    ];
}

// odczytuje i normalizuje stan licznika z sesji
function askee_chat_get_session_rate_limit_state() {
    $default_state = askee_chat_get_default_session_rate_limit_state();

    if (session_status() !== PHP_SESSION_ACTIVE) {
        return $default_state;
    }

    if (
        !isset($_SESSION["askee_chat_rate_limit"]) ||
        !is_array($_SESSION["askee_chat_rate_limit"])
    ) {
        return $default_state;
    }

    $stored_state = $_SESSION["askee_chat_rate_limit"];

    return [
        "window_started_at_timestamp" => max(
            0,
            (int) ($stored_state["window_started_at_timestamp"] ?? 0),
        ),
        "messages_sent_in_window_count" => max(
            0,
            (int) ($stored_state["messages_sent_in_window_count"] ?? 0),
        ),
        "blocked_until_timestamp" => max(0, (int) ($stored_state["blocked_until_timestamp"] ?? 0)),
    ];
}

// zapisuje stan licznika do sesji
function askee_chat_set_session_rate_limit_state($state) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $_SESSION["askee_chat_rate_limit"] = [
        "window_started_at_timestamp" => max(0, (int) ($state["window_started_at_timestamp"] ?? 0)),
        "messages_sent_in_window_count" => max(
            0,
            (int) ($state["messages_sent_in_window_count"] ?? 0),
        ),
        "blocked_until_timestamp" => max(0, (int) ($state["blocked_until_timestamp"] ?? 0)),
    ];
}

// sprawdza i aktualizuje licznik rate limitu po sesji
function askee_chat_check_and_update_session_rate_limit() {
    $current_timestamp = time();
    $window_seconds = ASKEE_CHAT_SESSION_RATE_LIMIT_WINDOW_SECONDS;
    $max_messages = ASKEE_CHAT_SESSION_RATE_LIMIT_MAX_MESSAGES;

    $state = askee_chat_get_session_rate_limit_state();

    // jesli blokada nadal trwa, zwracamy pozostaly czas i nie zwiekszamy licznika
    if ($state["blocked_until_timestamp"] > $current_timestamp) {
        $seconds_left = $state["blocked_until_timestamp"] - $current_timestamp;
        $minutes_left = (int) ceil($seconds_left / 60);

        return [
            "is_blocked" => true,
            "minutes_left" => max(1, $minutes_left),
            "blocked_until_timestamp" => $state["blocked_until_timestamp"],
        ];
    }

    // blokada minela, resetujemy stan
    if (
        $state["blocked_until_timestamp"] > 0 &&
        $state["blocked_until_timestamp"] <= $current_timestamp
    ) {
        $state = askee_chat_get_default_session_rate_limit_state();
    }

    $window_started_at_timestamp = (int) $state["window_started_at_timestamp"];
    $window_age_seconds = $current_timestamp - $window_started_at_timestamp;

    // jesli nie ma aktywnego okna lub okno wygaslo, zaczynamy nowe
    if ($window_started_at_timestamp <= 0 || $window_age_seconds >= $window_seconds) {
        $state["window_started_at_timestamp"] = $current_timestamp;
        $state["messages_sent_in_window_count"] = 0;
        $state["blocked_until_timestamp"] = 0;
    }

    // aktualny request liczy sie do limitu
    $state["messages_sent_in_window_count"] = (int) $state["messages_sent_in_window_count"] + 1;

    // 25. request uruchamia blokade na 30 minut, ten request jeszcze przechodzi
    if ($state["messages_sent_in_window_count"] >= $max_messages) {
        $state["blocked_until_timestamp"] = $current_timestamp + $window_seconds;
    }

    askee_chat_set_session_rate_limit_state($state);

    return [
        "is_blocked" => false,
        "minutes_left" => 0,
        "blocked_until_timestamp" => (int) $state["blocked_until_timestamp"],
    ];
}

// 4. ODBIERAMY REQUEST Z FRONTU I PRZEKAZUJEMY DO WEBHOOKA
function askee_chat_proxy_callback(WP_REST_Request $request) {
    $nonce = $request->get_header("x-wp-nonce");

    // walidacja nonce
    if (!$nonce || !wp_verify_nonce($nonce, "wp_rest")) {
        return new WP_REST_Response(["ok" => false, "error" => "invalid_nonce"], 403);
    }

    // walidacja kluczy itd
    if (!defined("ASKEE_WISE_WEBHOOK_URL") || !defined("ASKEE_WISE_API_KEY")) {
        return new WP_REST_Response(["ok" => false, "error" => "server_not_configured"], 500);
    }

    $webhook_url = (string) ASKEE_WISE_WEBHOOK_URL;
    $api_key = (string) ASKEE_WISE_API_KEY;

    $input_raw = $request->get_param("input");
    if (!is_string($input_raw)) {
        $json = $request->get_json_params();
        if (is_array($json) && isset($json["input"]) && is_string($json["input"])) {
            $input_raw = $json["input"];
        }
    }

    $input = is_string($input_raw) ? sanitize_textarea_field($input_raw) : "";
    if ($input === "") {
        return new WP_REST_Response(["ok" => false, "error" => "empty_input"], 422);
    }

    $topic_raw = $request->get_param("topic");
    if (!is_string($topic_raw)) {
        $json = isset($json) && is_array($json) ? $json : $request->get_json_params();
        if (is_array($json) && isset($json["topic"]) && is_string($json["topic"])) {
            $topic_raw = $json["topic"];
        }
    }

    $topic = is_string($topic_raw) ? sanitize_title($topic_raw) : "";

    $session_id_raw = askee_chat_get_or_start_session_id();
    $session_id = is_string($session_id_raw) ? sanitize_text_field($session_id_raw) : "";

    // zabezpieczenie: rate limit dziala tylko gdy sesja jest aktywna
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return new WP_REST_Response(["ok" => false, "error" => "session_unavailable"], 503);
    }

    $rate_limit_result = askee_chat_check_and_update_session_rate_limit();
    if (!empty($rate_limit_result["is_blocked"])) {
        $minutes_left = max(1, (int) ($rate_limit_result["minutes_left"] ?? 1));
        $blocked_message = sprintf(
            "Przepraszamy, limit został przekroczony. Spróbuj ponownie za %d min.",
            $minutes_left,
        );

        return new WP_REST_Response(
            [
                "ok" => true,
                "status" => 429,
                "session" => $session_id,
                "raw" => $blocked_message,
                "json" => [
                    [
                        "output" => $blocked_message,
                    ],
                ],
                "rate_limit" => [
                    "minutes_left" => $minutes_left,
                    "blocked_until_timestamp" =>
                        (int) ($rate_limit_result["blocked_until_timestamp"] ?? 0),
                ],
            ],
            429,
        );
    }

    $payload = [
        "Input" => $input,
        "topic" => $topic,
        "session" => $session_id,
    ];

    // 5. WYSYŁKA WSZYSTKIEGO CO MAMY
    $response = wp_remote_post($webhook_url, [
        "timeout" => 80,
        "headers" => [
            "Content-Type" => "application/json; charset=utf-8",
            "x-api-key" => $api_key,
        ],
        "body" => wp_json_encode($payload),
    ]);

    if (is_wp_error($response)) {
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "upstream_error",
                "message" => $response->get_error_message(),
            ],
            502,
        );
    }

    // domyślne funkcje wp żeby wziać wszystko
    $status = (int) wp_remote_retrieve_response_code($response);
    $body = (string) wp_remote_retrieve_body($response);

    $decoded = null;
    if ($body !== "") {
        $decoded = json_decode($body, true);
    }

    // 6. ZWROT WSZYSTKIEGO CO POTRZEBUJEMY
    return new WP_REST_Response(
        [
            "ok" => $status >= 200 && $status < 300,
            "status" => $status,
            "session" => $session_id,
            "raw" => $body,
            "json" => $decoded,
        ],
        200,
    );
}
