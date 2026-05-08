<?php

if (!defined("ABSPATH")) {
    exit();
}

define("ASKEE_CONTACT_RATE_LIMIT_MAX_MESSAGES", 5);
define("ASKEE_CONTACT_RATE_LIMIT_WINDOW_SECONDS", 1800);
define("ASKEE_CONTACT_HONEYPOT_FIELD_NAME", "askee_website_url");
define("ASKEE_CONTACT_MIN_SUBMIT_SECONDS", 2);

// lista adresow odbiorcow maila kontaktowego. dedup ma chronic na przyszlosc
// gdyby ktos wkleil duplikat.
function askee_contact_get_recipient_emails_array() {
    $recipient_emails_array = [
        "kontakt@askee.pl",
        "Piotr.Pszczolkowski@askee.app",
        "kontakt@askee.app",
        "kontakt@ercoding.pl",
    ];

    $normalized_emails_array = [];
    foreach ($recipient_emails_array as $recipient_email_string) {
        $sanitized_recipient_email_string = sanitize_email((string) $recipient_email_string);
        if ($sanitized_recipient_email_string === "") {
            continue;
        }

        $lowercased_recipient_email_string = strtolower($sanitized_recipient_email_string);
        if (in_array($lowercased_recipient_email_string, $normalized_emails_array, true)) {
            continue;
        }

        $normalized_emails_array[] = $lowercased_recipient_email_string;
    }

    return $normalized_emails_array;
}

// rejestracja endpointow REST dla formularza kontaktowego
add_action("rest_api_init", function () {
    register_rest_route("askee/v1", "/contact", [
        "methods" => "POST",
        "callback" => "askee_contact_form_callback",
        "permission_callback" => "__return_true",
    ]);

    register_rest_route("askee/v1", "/contact-nonce", [
        "methods" => "GET",
        "callback" => "askee_contact_nonce_callback",
        "permission_callback" => "__return_true",
    ]);
});

// zwraca swiezy nonce na potrzeby ponownej wysylki, gdy poprzedni wygasl
function askee_contact_nonce_callback() {
    $response = new WP_REST_Response([
        "ok" => true,
        "nonce" => wp_create_nonce("wp_rest"),
    ]);

    $response->header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    $response->header("Pragma", "no-cache");
    $response->header("Expires", "0");

    return $response;
}

// pobiera albo uruchamia sesje i zwraca jej id (potrzebne dla rate limitu)
function askee_contact_get_or_start_session_id() {
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

// pobiera ip usera z requestu (w tym naglowki proxy/cloudflare)
function askee_contact_get_request_ip_address() {
    $server_keys = ["HTTP_CF_CONNECTING_IP", "HTTP_X_FORWARDED_FOR", "REMOTE_ADDR"];

    foreach ($server_keys as $server_key) {
        if (!isset($_SERVER[$server_key]) || !is_string($_SERVER[$server_key])) {
            continue;
        }

        $raw_ip_value = trim($_SERVER[$server_key]);
        if ($raw_ip_value === "") {
            continue;
        }

        if (strpos($raw_ip_value, ",") !== false) {
            $ip_parts = explode(",", $raw_ip_value);
            $raw_ip_value = trim((string) ($ip_parts[0] ?? ""));
        }

        if (filter_var($raw_ip_value, FILTER_VALIDATE_IP)) {
            return $raw_ip_value;
        }
    }

    return "";
}

// domyslny stan licznika rate limitu w sesji
function askee_contact_get_default_rate_limit_state() {
    return [
        "window_started_at_timestamp" => 0,
        "messages_sent_in_window_count" => 0,
        "blocked_until_timestamp" => 0,
    ];
}

// odczyt i normalizacja stanu licznika z sesji
function askee_contact_get_rate_limit_state() {
    $default_state = askee_contact_get_default_rate_limit_state();

    if (session_status() !== PHP_SESSION_ACTIVE) {
        return $default_state;
    }

    if (
        !isset($_SESSION["askee_contact_rate_limit"]) ||
        !is_array($_SESSION["askee_contact_rate_limit"])
    ) {
        return $default_state;
    }

    $stored_state = $_SESSION["askee_contact_rate_limit"];

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

// zapis stanu licznika do sesji
function askee_contact_set_rate_limit_state($state) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $_SESSION["askee_contact_rate_limit"] = [
        "window_started_at_timestamp" => max(0, (int) ($state["window_started_at_timestamp"] ?? 0)),
        "messages_sent_in_window_count" => max(
            0,
            (int) ($state["messages_sent_in_window_count"] ?? 0),
        ),
        "blocked_until_timestamp" => max(0, (int) ($state["blocked_until_timestamp"] ?? 0)),
    ];
}

// sprawdza i aktualizuje licznik wysylek z formularza
function askee_contact_check_and_update_rate_limit() {
    $current_timestamp = time();
    $window_seconds = ASKEE_CONTACT_RATE_LIMIT_WINDOW_SECONDS;
    $max_messages = ASKEE_CONTACT_RATE_LIMIT_MAX_MESSAGES;

    $state = askee_contact_get_rate_limit_state();

    if ($state["blocked_until_timestamp"] > $current_timestamp) {
        $seconds_left = $state["blocked_until_timestamp"] - $current_timestamp;
        $minutes_left = (int) ceil($seconds_left / 60);

        return [
            "is_blocked" => true,
            "minutes_left" => max(1, $minutes_left),
            "blocked_until_timestamp" => $state["blocked_until_timestamp"],
        ];
    }

    if (
        $state["blocked_until_timestamp"] > 0 &&
        $state["blocked_until_timestamp"] <= $current_timestamp
    ) {
        $state = askee_contact_get_default_rate_limit_state();
    }

    $window_started_at_timestamp = (int) $state["window_started_at_timestamp"];
    $window_age_seconds = $current_timestamp - $window_started_at_timestamp;

    if ($window_started_at_timestamp <= 0 || $window_age_seconds >= $window_seconds) {
        $state["window_started_at_timestamp"] = $current_timestamp;
        $state["messages_sent_in_window_count"] = 0;
        $state["blocked_until_timestamp"] = 0;
    }

    $state["messages_sent_in_window_count"] = (int) $state["messages_sent_in_window_count"] + 1;

    if ($state["messages_sent_in_window_count"] >= $max_messages) {
        $state["blocked_until_timestamp"] = $current_timestamp + $window_seconds;
    }

    askee_contact_set_rate_limit_state($state);

    return [
        "is_blocked" => false,
        "minutes_left" => 0,
        "blocked_until_timestamp" => (int) $state["blocked_until_timestamp"],
    ];
}

// IP-based rate limit przez transient. Dziala bez sesji,
// czyli odporny na przegladarki bez cookies / cache CF strippujacy Set-Cookie.
function askee_contact_check_and_update_ip_rate_limit() {
    $request_ip_address = askee_contact_get_request_ip_address();
    if ($request_ip_address === "") {
        // brak IP - zwracamy nieblokowane, sesyjny rate limit przejmie kontrole
        return [
            "is_blocked" => false,
            "minutes_left" => 0,
        ];
    }

    $ip_hash_string = hash("sha256", $request_ip_address . "|" . wp_salt("auth"));
    $transient_key_string = "askee_contact_iprl_" . substr($ip_hash_string, 0, 32);

    $current_timestamp = time();
    $window_seconds = ASKEE_CONTACT_RATE_LIMIT_WINDOW_SECONDS;
    $max_messages = ASKEE_CONTACT_RATE_LIMIT_MAX_MESSAGES;

    $stored_state_array = get_transient($transient_key_string);
    if (!is_array($stored_state_array)) {
        $stored_state_array = [
            "window_started_at_timestamp" => $current_timestamp,
            "messages_sent_in_window_count" => 0,
        ];
    }

    $window_started_at_timestamp = (int) ($stored_state_array["window_started_at_timestamp"] ?? 0);
    $window_age_seconds = $current_timestamp - $window_started_at_timestamp;
    if ($window_started_at_timestamp <= 0 || $window_age_seconds >= $window_seconds) {
        $stored_state_array = [
            "window_started_at_timestamp" => $current_timestamp,
            "messages_sent_in_window_count" => 0,
        ];
        $window_started_at_timestamp = $current_timestamp;
    }

    $current_count_number =
        (int) ($stored_state_array["messages_sent_in_window_count"] ?? 0) + 1;
    $stored_state_array["messages_sent_in_window_count"] = $current_count_number;

    set_transient($transient_key_string, $stored_state_array, $window_seconds);

    if ($current_count_number > $max_messages) {
        $window_ends_at_timestamp = $window_started_at_timestamp + $window_seconds;
        $minutes_left = (int) ceil(($window_ends_at_timestamp - $current_timestamp) / 60);

        return [
            "is_blocked" => true,
            "minutes_left" => max(1, $minutes_left),
        ];
    }

    return [
        "is_blocked" => false,
        "minutes_left" => 0,
    ];
}

// sciaga z requestu wartosc pola (z get_param i z json_params) jako string
function askee_contact_get_request_field_string(WP_REST_Request $request, $field_name_string) {
    $raw_field_value = $request->get_param($field_name_string);
    if (is_string($raw_field_value)) {
        return $raw_field_value;
    }

    $json_params = $request->get_json_params();
    if (is_array($json_params) && isset($json_params[$field_name_string])) {
        $raw_json_value = $json_params[$field_name_string];
        if (is_string($raw_json_value)) {
            return $raw_json_value;
        }
    }

    return "";
}

// normalizuje numer telefonu - zostawia cyfry, plus, spacje i znaki +-()
function askee_contact_normalize_phone_string($phone_input_string) {
    if (!is_string($phone_input_string)) {
        return "";
    }

    $trimmed_phone_string = trim($phone_input_string);
    if ($trimmed_phone_string === "") {
        return "";
    }

    $allowed_characters_phone_string = preg_replace('/[^0-9+\\-\\s()]/u', "", $trimmed_phone_string);
    if (!is_string($allowed_characters_phone_string)) {
        return "";
    }

    $collapsed_phone_string = preg_replace('/\\s+/u', " ", trim($allowed_characters_phone_string));
    if (!is_string($collapsed_phone_string)) {
        return "";
    }

    $only_digits_phone_string = preg_replace('/[^0-9]/u', "", $collapsed_phone_string);
    if (!is_string($only_digits_phone_string) || strlen($only_digits_phone_string) < 7) {
        return "";
    }

    if (strlen($only_digits_phone_string) > 18) {
        return "";
    }

    return $collapsed_phone_string;
}

// callback wlasciwego endpointu wysylki formularza
function askee_contact_form_callback(WP_REST_Request $request) {
    $nonce = $request->get_header("x-wp-nonce");
    if (!$nonce || !wp_verify_nonce($nonce, "wp_rest")) {
        return new WP_REST_Response(["ok" => false, "error" => "invalid_nonce"], 403);
    }

    // honeypot: pole nie powinno byc wypelnione przez czlowieka, jesli jest cokolwiek -> bot
    $honeypot_value_string = askee_contact_get_request_field_string(
        $request,
        ASKEE_CONTACT_HONEYPOT_FIELD_NAME,
    );
    if (trim($honeypot_value_string) !== "") {
        // udajemy sukces zeby bot nie wiedzial ze go zlapalismy
        return new WP_REST_Response(["ok" => true, "status" => "delivered"], 200);
    }

    // dodatkowy minimalny czas wypelnienia formularza (bot zwykle wysyla od razu)
    $form_loaded_at_timestamp = (int) askee_contact_get_request_field_string(
        $request,
        "form_loaded_at_timestamp",
    );
    $current_timestamp = time();
    if (
        $form_loaded_at_timestamp > 0 &&
        $current_timestamp - $form_loaded_at_timestamp < ASKEE_CONTACT_MIN_SUBMIT_SECONDS
    ) {
        // udajemy sukces - prawdopodobny bot
        return new WP_REST_Response(["ok" => true, "status" => "delivered"], 200);
    }

    // pola formularza
    $name_input_string = askee_contact_get_request_field_string($request, "name");
    $email_input_string = askee_contact_get_request_field_string($request, "email");
    $phone_input_string = askee_contact_get_request_field_string($request, "phone");
    $message_input_string = askee_contact_get_request_field_string($request, "message");
    $consent_input_value = askee_contact_get_request_field_string($request, "consent");

    $sanitized_name_string = sanitize_text_field($name_input_string);
    $sanitized_email_string = sanitize_email($email_input_string);
    $normalized_phone_string = askee_contact_normalize_phone_string($phone_input_string);
    $sanitized_message_string = sanitize_textarea_field($message_input_string);

    $field_errors_array = [];

    if ($sanitized_name_string === "" || mb_strlen($sanitized_name_string) < 2) {
        $field_errors_array["name"] = "Podaj imię i nazwisko (min. 2 znaki).";
    } elseif (mb_strlen($sanitized_name_string) > 120) {
        $field_errors_array["name"] = "Imię i nazwisko jest za długie (max 120 znaków).";
    }

    if ($sanitized_email_string === "" || !is_email($sanitized_email_string)) {
        $field_errors_array["email"] = "Podaj poprawny adres e-mail.";
    } elseif (mb_strlen($sanitized_email_string) > 190) {
        $field_errors_array["email"] = "Adres e-mail jest za długi.";
    }

    if ($normalized_phone_string === "") {
        $field_errors_array["phone"] = "Podaj poprawny numer telefonu.";
    }

    if ($sanitized_message_string === "" || mb_strlen($sanitized_message_string) < 10) {
        $field_errors_array["message"] = "Wiadomość jest za krótka (min. 10 znaków).";
    } elseif (mb_strlen($sanitized_message_string) > 3000) {
        $field_errors_array["message"] = "Wiadomość jest za długa (max 3000 znaków).";
    }

    $consent_normalized_string = strtolower(trim((string) $consent_input_value));
    $consent_accepted_boolean = in_array(
        $consent_normalized_string,
        ["1", "true", "yes", "on"],
        true,
    );
    if (!$consent_accepted_boolean) {
        $field_errors_array["consent"] =
            "Wymagana jest zgoda na przetwarzanie danych zgodnie z polityką prywatności.";
    }

    if (!empty($field_errors_array)) {
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "validation_failed",
                "fields" => $field_errors_array,
            ],
            422,
        );
    }

    // dwie warstwy rate limitu: IP (transient) zawsze + sesja jako bonus jak dziala
    $ip_rate_limit_result = askee_contact_check_and_update_ip_rate_limit();
    if (!empty($ip_rate_limit_result["is_blocked"])) {
        $minutes_left = max(1, (int) ($ip_rate_limit_result["minutes_left"] ?? 1));
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "rate_limited",
                "message" => sprintf(
                    "Przekroczono limit wiadomości. Spróbuj ponownie za %d min.",
                    $minutes_left,
                ),
                "minutes_left" => $minutes_left,
            ],
            429,
        );
    }

    askee_contact_get_or_start_session_id();
    if (session_status() === PHP_SESSION_ACTIVE) {
        $session_rate_limit_result = askee_contact_check_and_update_rate_limit();
        if (!empty($session_rate_limit_result["is_blocked"])) {
            $minutes_left = max(1, (int) ($session_rate_limit_result["minutes_left"] ?? 1));
            return new WP_REST_Response(
                [
                    "ok" => false,
                    "error" => "rate_limited",
                    "message" => sprintf(
                        "Przekroczono limit wiadomości. Spróbuj ponownie za %d min.",
                        $minutes_left,
                    ),
                    "minutes_left" => $minutes_left,
                ],
                429,
            );
        }
    }

    $recipient_emails_array = askee_contact_get_recipient_emails_array();
    if (empty($recipient_emails_array)) {
        return new WP_REST_Response(
            ["ok" => false, "error" => "no_recipients_configured"],
            500,
        );
    }

    $site_name_string = (string) wp_specialchars_decode(get_bloginfo("name"), ENT_QUOTES);
    $site_host_string = (string) parse_url(home_url(), PHP_URL_HOST);
    $request_ip_string = askee_contact_get_request_ip_address();
    $user_agent_string = isset($_SERVER["HTTP_USER_AGENT"])
        ? sanitize_text_field((string) $_SERVER["HTTP_USER_AGENT"])
        : "";
    $submission_datetime_string = wp_date("Y-m-d H:i:s");

    // From ustawiamy spojnie ze stalymi SMTP zeby SPF/DKIM dzialal i wiadomosc
    // zostala zaakceptowana przez serwer SMTP (musi sie zgadzac z autoryzacja)
    $from_email_string = defined("ASKEE_SMTP_FROM_EMAIL")
        ? (string) ASKEE_SMTP_FROM_EMAIL
        : "noreply@" . $site_host_string;
    $from_name_string = defined("ASKEE_SMTP_FROM_NAME")
        ? (string) ASKEE_SMTP_FROM_NAME
        : ($site_name_string !== "" ? $site_name_string : "Askee");

    $email_subject_string = sprintf(
        "[Askee — formularz kontaktowy] Nowa wiadomość od %s",
        $sanitized_name_string,
    );

    $email_body_lines_array = [
        "Nowa wiadomość z formularza kontaktowego na " . home_url("/kontakt/"),
        "",
        "Imię i nazwisko: " . $sanitized_name_string,
        "E-mail: " . $sanitized_email_string,
        "Telefon: " . $normalized_phone_string,
        "",
        "Treść wiadomości:",
        $sanitized_message_string,
        "",
        "—",
        "Data: " . $submission_datetime_string,
        "IP: " . ($request_ip_string !== "" ? $request_ip_string : "n/d"),
        "User-Agent: " . ($user_agent_string !== "" ? $user_agent_string : "n/d"),
    ];
    $email_body_string = implode("\n", $email_body_lines_array);

    $email_headers_array = [
        "Content-Type: text/plain; charset=UTF-8",
        sprintf("From: %s <%s>", $from_name_string, $from_email_string),
        sprintf("Reply-To: %s <%s>", $sanitized_name_string, $sanitized_email_string),
    ];

    $mail_sent_successfully = wp_mail(
        $recipient_emails_array,
        $email_subject_string,
        $email_body_string,
        $email_headers_array,
    );

    if (!$mail_sent_successfully) {
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "mail_send_failed",
                "message" => "Nie udało się wysłać wiadomości. Spróbuj ponownie później.",
            ],
            500,
        );
    }

    return new WP_REST_Response(
        [
            "ok" => true,
            "status" => "delivered",
            "message" => "Dziękujemy! Wiadomość została wysłana — odezwiemy się wkrótce.",
        ],
        200,
    );
}

// rejestruje konfiguracje frontendu formularza kontaktowego (REST URL, nonce, honeypot field name)
function askee_register_contact_form_config() {
    if (!wp_script_is("askeetheme-main", "enqueued")) {
        return;
    }

    $config_array = [
        "restUrl" => esc_url_raw(rest_url("askee/v1/contact")),
        "nonceRefreshUrl" => esc_url_raw(rest_url("askee/v1/contact-nonce")),
        "nonce" => wp_create_nonce("wp_rest"),
        "honeypotFieldName" => ASKEE_CONTACT_HONEYPOT_FIELD_NAME,
    ];

    wp_add_inline_script(
        "askeetheme-main",
        "window.AskeeContactConfig = " . wp_json_encode($config_array) . ";",
        "before",
    );
}
add_action("wp_enqueue_scripts", "askee_register_contact_form_config", 22);
