<?php

if (!defined("ABSPATH")) {
    exit();
}

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

    $payload = [
        "Input" => $input,
        "topic" => $topic,
        "session" => $session_id,
    ];

    // 5. WYSYŁKA WSZYSTKIEGO CO MAMY
    $response = wp_remote_post($webhook_url, [
        "timeout" => 60,
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
