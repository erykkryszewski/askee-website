<?php

if (!defined("ABSPATH")) {
    exit();
}

/**
 * Askee — system ticketowy.
 *
 * Zawiera:
 *  - Custom Post Type `askee_ticket` + custom post statuses (otwarte/w trakcie/...)
 *  - REST endpoint POST /wp-json/askee/v1/ticket (przyjmuje multipart, zalacza pliki)
 *  - REST endpoint GET  /wp-json/askee/v1/ticket-nonce (refresh nonca dla SPA)
 *  - Mail do nas (per-recipient) + mail potwierdzajacy do usera
 *  - Panel admina: lista CPT z kolumnami, filtry, quick-edit statusu, notatki wewnetrzne
 *  - Export CSV pod menu CPT
 *  - Frontend config window.AskeeTicketConfig dla js/src/sections/ticket-form.js
 *
 * Konwencje stalych (wszystkie z prefixem ASKEE_TICKET_*):
 *  - kategorie, statusy, limity walidacji, limity uploadu, rate limit
 *
 * Plik celowo nie zalezy od lib/functions/contact-form.php — funkcje pomocnicze
 * (IP, session, rate limit, request field) sa zduplikowane z prefixem askee_ticket_*
 * zeby ticket-system byl w pelni izolowany. Jesli kiedys bedzie sens scalenia
 * do `lib/functions/form-helpers.php`, dwie kopie funkcji sa atomic do refaktoru.
 */

// stale: numer ticketu, kategorie, statusy
define("ASKEE_TICKET_CPT_SLUG", "askee_ticket");
define("ASKEE_TICKET_NUMBER_PREFIX", "ASK");

// limity walidacji wiadomosci (zsynchronizowane z contact-form gdzie to ma sens)
define("ASKEE_TICKET_NAME_MIN_LENGTH", 2);
define("ASKEE_TICKET_NAME_MAX_LENGTH", 120);
define("ASKEE_TICKET_EMAIL_MAX_LENGTH", 190);
define("ASKEE_TICKET_MESSAGE_MIN_LENGTH", 10);
define("ASKEE_TICKET_MESSAGE_MAX_LENGTH", 6000);

// dane firmowe zglaszajacego — wymagane (kazdy user systemu ticketowego ma firme i stanowisko)
define("ASKEE_TICKET_COMPANY_MIN_LENGTH", 2);
define("ASKEE_TICKET_COMPANY_MAX_LENGTH", 160);
define("ASKEE_TICKET_POSITION_MIN_LENGTH", 2);
define("ASKEE_TICKET_POSITION_MAX_LENGTH", 120);

// link do bazy wiedzy/instrukcji — intro formularza + mail potwierdzajacy
if (!defined("ASKEE_TICKET_KNOWLEDGE_BASE_URL")) {
    define("ASKEE_TICKET_KNOWLEDGE_BASE_URL", "/faq/");
}

// honeypot i timestamp trap — tak samo jak w contact-form
define("ASKEE_TICKET_HONEYPOT_FIELD_NAME", "askee_website_url");
define("ASKEE_TICKET_MIN_SUBMIT_SECONDS", 2);

// rate limit (osobny od contact-form, mozemy luzniej traktowac tickety)
define("ASKEE_TICKET_RATE_LIMIT_MAX_MESSAGES", 5);
define("ASKEE_TICKET_RATE_LIMIT_WINDOW_SECONDS", 1800);

// limity uploadu zalacznikow
define("ASKEE_TICKET_ATTACHMENT_MAX_COUNT", 3);
define("ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE", 5 * 1024 * 1024); // 5 MB
define("ASKEE_TICKET_ATTACHMENT_ALLOWED_EXTENSIONS_CSV", "jpg,jpeg,png,gif,pdf,doc,docx,txt");

// =============================================================================
// 1. KATEGORIE I STATUSY (single source of truth)
// =============================================================================

// dostepne kategorie zgloszen — dropdown frontend + walidacja serwerowa
function askee_ticket_get_categories_map() {
    return [
        "general" => "Pytanie ogólne",
        "technical" => "Problem techniczny",
        "callback" => "Prośba o kontakt",
        "other" => "Inne",
    ];
}

// dostepne statusy ticketu — single source of truth dla:
// - register_post_status()
// - kolumny admin
// - quick edit / sidebar dropdown
// - filtr w toolbar
function askee_ticket_get_statuses_map() {
    return [
        "ask_open" => "Otwarte",
        "ask_progress" => "W trakcie",
        "ask_waiting" => "Czeka na użytkownika",
        "ask_resolved" => "Rozwiązane",
        "ask_closed" => "Zamknięte",
    ];
}

// domyslny status — z tym kazdy nowy ticket startuje
function askee_ticket_get_default_status_slug() {
    return "ask_open";
}

// =============================================================================
// 2. HELPERY POMOCNICZE — IP, session, request field, sanityzacja, normalizacje
// =============================================================================

// pobiera albo uruchamia sesje i zwraca jej id (dla session-rate-limit)
function askee_ticket_get_or_start_session_id() {
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

// pobiera ip usera z requestu (z naglowkami proxy/cloudflare)
function askee_ticket_get_request_ip_address() {
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

// sciaga wartosc pola z requestu jako string (z get_param albo z json/form body)
function askee_ticket_get_request_field_string(WP_REST_Request $request, $field_name_string) {
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

// normalizuje numer telefonu — kopia logiki z contact-form, ale w ticket-system
// telefon jest OPCJONALNY, wiec zwracamy "" jako akceptowalna wartosc
function askee_ticket_normalize_phone_string($phone_input_string) {
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
    if (!is_string($only_digits_phone_string)) {
        return "";
    }

    // za krotki lub za dlugi — traktujemy jako "brak" (pole opcjonalne)
    if (strlen($only_digits_phone_string) < 7 || strlen($only_digits_phone_string) > 18) {
        return "";
    }

    return $collapsed_phone_string;
}

// hash uzytkownika do laczenia zgloszen tego samego usera niezaleznie od kapitalizacji
// i bialych znakow. Zapisywany jako meta `_askee_ticket_user_identifier`.
function askee_ticket_build_user_identifier_hash($email_string, $name_string) {
    $email_normalized = strtolower(trim((string) $email_string));
    $name_normalized = strtolower(trim((string) $name_string));

    // kolapsowanie spacji w imieniu — "Jan   Kowalski" == "jan kowalski"
    $name_normalized = (string) preg_replace('/\\s+/u', " ", $name_normalized);

    return hash("sha256", $email_normalized . "|" . $name_normalized);
}

// =============================================================================
// 3. RATE LIMIT (sesja + IP transient — tak samo jak w contact-form)
// =============================================================================

// domyslny stan licznika sesji
function askee_ticket_get_default_rate_limit_state() {
    return [
        "window_started_at_timestamp" => 0,
        "messages_sent_in_window_count" => 0,
        "blocked_until_timestamp" => 0,
    ];
}

// odczyt stanu licznika z sesji
function askee_ticket_get_rate_limit_state() {
    $default_state = askee_ticket_get_default_rate_limit_state();

    if (session_status() !== PHP_SESSION_ACTIVE) {
        return $default_state;
    }

    if (!isset($_SESSION["askee_ticket_rate_limit"]) || !is_array($_SESSION["askee_ticket_rate_limit"])) {
        return $default_state;
    }

    $stored_state = $_SESSION["askee_ticket_rate_limit"];

    return [
        "window_started_at_timestamp" => max(0, (int) ($stored_state["window_started_at_timestamp"] ?? 0)),
        "messages_sent_in_window_count" => max(0, (int) ($stored_state["messages_sent_in_window_count"] ?? 0)),
        "blocked_until_timestamp" => max(0, (int) ($stored_state["blocked_until_timestamp"] ?? 0)),
    ];
}

// zapis stanu licznika do sesji
function askee_ticket_set_rate_limit_state($state) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $_SESSION["askee_ticket_rate_limit"] = [
        "window_started_at_timestamp" => max(0, (int) ($state["window_started_at_timestamp"] ?? 0)),
        "messages_sent_in_window_count" => max(0, (int) ($state["messages_sent_in_window_count"] ?? 0)),
        "blocked_until_timestamp" => max(0, (int) ($state["blocked_until_timestamp"] ?? 0)),
    ];
}

// sprawdza i aktualizuje licznik wysylek w sesji
function askee_ticket_check_and_update_rate_limit() {
    $current_timestamp = time();
    $window_seconds = ASKEE_TICKET_RATE_LIMIT_WINDOW_SECONDS;
    $max_messages = ASKEE_TICKET_RATE_LIMIT_MAX_MESSAGES;

    $state = askee_ticket_get_rate_limit_state();

    if ($state["blocked_until_timestamp"] > $current_timestamp) {
        $seconds_left = $state["blocked_until_timestamp"] - $current_timestamp;
        $minutes_left = (int) ceil($seconds_left / 60);

        return [
            "is_blocked" => true,
            "minutes_left" => max(1, $minutes_left),
        ];
    }

    if ($state["blocked_until_timestamp"] > 0 && $state["blocked_until_timestamp"] <= $current_timestamp) {
        $state = askee_ticket_get_default_rate_limit_state();
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

    askee_ticket_set_rate_limit_state($state);

    return [
        "is_blocked" => false,
        "minutes_left" => 0,
    ];
}

// IP-based rate limit przez transient (dziala bez sesji)
function askee_ticket_check_and_update_ip_rate_limit() {
    $request_ip_address = askee_ticket_get_request_ip_address();
    if ($request_ip_address === "") {
        return ["is_blocked" => false, "minutes_left" => 0];
    }

    $ip_hash_string = hash("sha256", $request_ip_address . "|" . wp_salt("auth"));
    $transient_key_string = "askee_ticket_iprl_" . substr($ip_hash_string, 0, 32);

    $current_timestamp = time();
    $window_seconds = ASKEE_TICKET_RATE_LIMIT_WINDOW_SECONDS;
    $max_messages = ASKEE_TICKET_RATE_LIMIT_MAX_MESSAGES;

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

    $current_count_number = (int) ($stored_state_array["messages_sent_in_window_count"] ?? 0) + 1;
    $stored_state_array["messages_sent_in_window_count"] = $current_count_number;

    set_transient($transient_key_string, $stored_state_array, $window_seconds);

    if ($current_count_number > $max_messages) {
        $window_ends_at_timestamp = $window_started_at_timestamp + $window_seconds;
        $minutes_left = (int) ceil(($window_ends_at_timestamp - $current_timestamp) / 60);

        return ["is_blocked" => true, "minutes_left" => max(1, $minutes_left)];
    }

    return ["is_blocked" => false, "minutes_left" => 0];
}

// =============================================================================
// 4. NUMERACJA TICKETOW (per-rok counter w wp_options)
// =============================================================================

// zwraca kolejny numer ticketu w formacie "ASK-YYYY-NNNN"
// uzywa update_option z autoload=false zeby nie obciazac wp_load_alloptions().
// Read-modify-write ma minimalne okno race condition; przy realistycznym
// natezeniu zgloszen (kilka/dzien) szanse na duplikat sa nieistotne. Jesli
// w przyszlosci kiedys nastapi prawdziwa konkurencja, dolozymy lock przez
// `wp_cache_add()` z retry.
function askee_ticket_generate_next_number() {
    $current_year_string = wp_date("Y");
    $option_key_string = "askee_ticket_counter_" . $current_year_string;

    $current_counter = (int) get_option($option_key_string, 0);
    $next_counter = $current_counter + 1;

    update_option($option_key_string, $next_counter, false);

    return sprintf(
        "%s-%s-%04d",
        ASKEE_TICKET_NUMBER_PREFIX,
        $current_year_string,
        $next_counter
    );
}

// regex do walidacji "kontynuujemy ticket #ASK-2026-0001" w polu opcjonalnym
function askee_ticket_get_number_regex_pattern() {
    return '/^' . preg_quote(ASKEE_TICKET_NUMBER_PREFIX, '/') . '-\\d{4}-\\d{4,}$/i';
}

// =============================================================================
// 5. REJESTRACJA CPT I CUSTOM POST STATUSES
// =============================================================================

add_action("init", "askee_ticket_register_post_type");
function askee_ticket_register_post_type() {
    register_post_type(ASKEE_TICKET_CPT_SLUG, [
        "labels" => [
            "name" => "Zgłoszenia",
            "singular_name" => "Zgłoszenie",
            "menu_name" => "Zgłoszenia",
            "all_items" => "Wszystkie zgłoszenia",
            "add_new" => "Dodaj zgłoszenie",
            "add_new_item" => "Dodaj zgłoszenie",
            "edit_item" => "Edytuj zgłoszenie",
            "new_item" => "Nowe zgłoszenie",
            "view_item" => "Zobacz zgłoszenie",
            "search_items" => "Szukaj zgłoszeń",
            "not_found" => "Brak zgłoszeń",
            "not_found_in_trash" => "Brak zgłoszeń w koszu",
        ],
        "public" => false,
        "publicly_queryable" => false,
        "show_ui" => true,
        "show_in_menu" => true,
        "show_in_rest" => false,
        "show_in_admin_bar" => false,
        "menu_position" => 26,
        "menu_icon" => "dashicons-tickets-alt",
        "supports" => ["title"],
        "has_archive" => false,
        "rewrite" => false,
        "query_var" => false,
        "capability_type" => "post",
        // mapujemy capabilities do "post" zeby admini z manage_options/edit_posts mogli zarzadzac
        "map_meta_cap" => true,
    ]);
}

add_action("init", "askee_ticket_register_post_statuses");
function askee_ticket_register_post_statuses() {
    $statuses_map = askee_ticket_get_statuses_map();

    foreach ($statuses_map as $status_slug_string => $status_label_string) {
        register_post_status($status_slug_string, [
            "label" => $status_label_string,
            "public" => false,
            "internal" => false,
            "exclude_from_search" => true,
            "show_in_admin_all_list" => true,
            "show_in_admin_status_list" => true,
            "label_count" => _n_noop(
                $status_label_string . ' <span class="count">(%s)</span>',
                $status_label_string . ' <span class="count">(%s)</span>'
            ),
        ]);
    }
}

// strona /zgloszenia/ jest dostepna tylko z aplikacji my.askee.app — nigdzie jej
// nie linkujemy i nie chcemy zeby trafila do indeksu wyszukiwarek
add_filter("wp_robots", "askee_ticket_noindex_submission_page");
function askee_ticket_noindex_submission_page($robots_array) {
    if (function_exists("is_page") && is_page("zgloszenia") && function_exists("wp_robots_no_robots")) {
        return wp_robots_no_robots($robots_array);
    }
    return $robots_array;
}

// =============================================================================
// 6. REST ENDPOINTS
// =============================================================================

add_action("rest_api_init", function () {
    register_rest_route("askee/v1", "/ticket", [
        "methods" => "POST",
        "callback" => "askee_ticket_form_callback",
        "permission_callback" => "__return_true",
    ]);

    register_rest_route("askee/v1", "/ticket-nonce", [
        "methods" => "GET",
        "callback" => "askee_ticket_nonce_callback",
        "permission_callback" => "__return_true",
    ]);
});

// nonce refresh — wzorzec identyczny jak w contact-form, no-cache headers
function askee_ticket_nonce_callback() {
    $response = new WP_REST_Response([
        "ok" => true,
        "nonce" => wp_create_nonce("wp_rest"),
    ]);

    $response->header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    $response->header("Pragma", "no-cache");
    $response->header("Expires", "0");

    return $response;
}

// =============================================================================
// 7. UPLOAD ZALACZNIKOW
// =============================================================================

// zwraca whitelist rozszerzen (lowercase, bez kropek) z konfiguracyjnej stalej
function askee_ticket_get_allowed_extensions_array() {
    $allowed_extensions_csv = (string) ASKEE_TICKET_ATTACHMENT_ALLOWED_EXTENSIONS_CSV;
    $extensions_array = array_filter(array_map(function ($raw_extension) {
        return strtolower(trim((string) $raw_extension, ". \t"));
    }, explode(",", $allowed_extensions_csv)));

    return array_values(array_unique($extensions_array));
}

// waliduje i przenosi upload — zwraca ["ok" => bool, "attachment_id" => int, "error" => string]
function askee_ticket_handle_single_file_upload($files_entry_array, $ticket_post_id) {
    if (
        !is_array($files_entry_array) ||
        !isset($files_entry_array["name"], $files_entry_array["tmp_name"], $files_entry_array["error"])
    ) {
        return ["ok" => false, "error" => "Nieprawidłowy plik."];
    }

    $upload_error_code = (int) $files_entry_array["error"];
    if ($upload_error_code !== UPLOAD_ERR_OK) {
        return ["ok" => false, "error" => "Błąd uploadu pliku."];
    }

    $original_filename_string = (string) ($files_entry_array["name"] ?? "");
    $file_size_bytes = (int) ($files_entry_array["size"] ?? 0);

    if ($file_size_bytes > ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE) {
        return [
            "ok" => false,
            "error" => sprintf(
                'Plik "%s" jest za duży (max %d MB).',
                $original_filename_string,
                (int) (ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE / 1024 / 1024)
            ),
        ];
    }

    $extension_string = strtolower((string) pathinfo($original_filename_string, PATHINFO_EXTENSION));
    $allowed_extensions_array = askee_ticket_get_allowed_extensions_array();

    if ($extension_string === "" || !in_array($extension_string, $allowed_extensions_array, true)) {
        return [
            "ok" => false,
            "error" => sprintf(
                'Niedozwolony typ pliku "%s". Dozwolone: %s.',
                $original_filename_string,
                implode(", ", $allowed_extensions_array)
            ),
        ];
    }

    // wp_check_filetype waliduje rozszerzenie + MIME wedlug uploadowanych mime_types
    $filetype_check_array = wp_check_filetype($original_filename_string);
    if (empty($filetype_check_array["ext"]) || empty($filetype_check_array["type"])) {
        return [
            "ok" => false,
            "error" => sprintf('Plik "%s" ma niedozwolony typ MIME.', $original_filename_string),
        ];
    }

    if (!function_exists("wp_handle_upload")) {
        require_once ABSPATH . "wp-admin/includes/file.php";
    }
    if (!function_exists("wp_insert_attachment")) {
        require_once ABSPATH . "wp-admin/includes/image.php";
    }

    $upload_overrides_array = [
        "test_form" => false,
        // dodatkowy whitelist MIME — wp_handle_upload odrzuci wszystko poza ta lista
        "mimes" => askee_ticket_get_allowed_mimes_map(),
    ];

    $handled_upload_array = wp_handle_upload($files_entry_array, $upload_overrides_array);

    if (!is_array($handled_upload_array) || isset($handled_upload_array["error"])) {
        $error_message_string = is_array($handled_upload_array)
            ? (string) ($handled_upload_array["error"] ?? "Nie udało się wgrać pliku.")
            : "Nie udało się wgrać pliku.";
        return ["ok" => false, "error" => $error_message_string];
    }

    $uploaded_file_path = (string) $handled_upload_array["file"];
    $uploaded_file_url = (string) $handled_upload_array["url"];
    $uploaded_mime_type = (string) ($handled_upload_array["type"] ?? "");

    $attachment_data_array = [
        "guid" => $uploaded_file_url,
        "post_mime_type" => $uploaded_mime_type,
        "post_title" => sanitize_text_field(pathinfo($original_filename_string, PATHINFO_FILENAME)),
        "post_content" => "",
        "post_status" => "inherit",
        "post_parent" => (int) $ticket_post_id,
    ];

    $attachment_id = wp_insert_attachment($attachment_data_array, $uploaded_file_path, (int) $ticket_post_id);
    if (is_wp_error($attachment_id) || $attachment_id <= 0) {
        @unlink($uploaded_file_path);
        return ["ok" => false, "error" => "Nie udało się zapisać załącznika."];
    }

    // generujemy metadane (rozmiar, miniatury dla obrazow itd)
    $attachment_metadata_array = wp_generate_attachment_metadata($attachment_id, $uploaded_file_path);
    wp_update_attachment_metadata($attachment_id, $attachment_metadata_array);

    return ["ok" => true, "attachment_id" => (int) $attachment_id];
}

// mapa MIME typow przekazywana do wp_handle_upload jako whitelist
function askee_ticket_get_allowed_mimes_map() {
    return [
        "jpg|jpeg|jpe" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "pdf" => "application/pdf",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt" => "text/plain",
    ];
}

// =============================================================================
// 8. WLASCIWY ENDPOINT REST — wysylka, walidacja, mail, zapis CPT
// =============================================================================

function askee_ticket_form_callback(WP_REST_Request $request) {
    // nonce zawsze pierwszy — bez tego nie ufamy nawet honeypotowi
    $nonce = $request->get_header("x-wp-nonce");
    if (!$nonce || !wp_verify_nonce($nonce, "wp_rest")) {
        return new WP_REST_Response(["ok" => false, "error" => "invalid_nonce"], 403);
    }

    // honeypot — bot wypelnia ukryte pole, my udajemy sukces zeby go nie alertowac
    $honeypot_value_string = askee_ticket_get_request_field_string(
        $request,
        ASKEE_TICKET_HONEYPOT_FIELD_NAME
    );
    if (trim($honeypot_value_string) !== "") {
        return new WP_REST_Response(["ok" => true, "status" => "delivered"], 200);
    }

    // timestamp trap — submission < 2s od zaladowania = prawie na pewno bot
    $form_loaded_at_timestamp = (int) askee_ticket_get_request_field_string(
        $request,
        "form_loaded_at_timestamp"
    );
    $current_timestamp = time();
    if (
        $form_loaded_at_timestamp > 0 &&
        $current_timestamp - $form_loaded_at_timestamp < ASKEE_TICKET_MIN_SUBMIT_SECONDS
    ) {
        return new WP_REST_Response(["ok" => true, "status" => "delivered"], 200);
    }

    // odczyt + sanityzacja pol
    $name_input_string = askee_ticket_get_request_field_string($request, "name");
    $email_input_string = askee_ticket_get_request_field_string($request, "email");
    $phone_input_string = askee_ticket_get_request_field_string($request, "phone");
    $company_input_string = askee_ticket_get_request_field_string($request, "company");
    $position_input_string = askee_ticket_get_request_field_string($request, "position");
    $category_input_string = askee_ticket_get_request_field_string($request, "category");
    $previous_ticket_input_string = askee_ticket_get_request_field_string($request, "previous_ticket_number");
    $message_input_string = askee_ticket_get_request_field_string($request, "message");
    $consent_input_value = askee_ticket_get_request_field_string($request, "consent");

    $sanitized_name_string = sanitize_text_field($name_input_string);
    $sanitized_email_string = sanitize_email($email_input_string);
    $normalized_phone_string = askee_ticket_normalize_phone_string($phone_input_string);
    $sanitized_company_string = sanitize_text_field($company_input_string);
    $sanitized_position_string = sanitize_text_field($position_input_string);
    $sanitized_category_string = sanitize_text_field($category_input_string);
    $sanitized_previous_ticket_string = strtoupper(trim(sanitize_text_field($previous_ticket_input_string)));
    $sanitized_message_string = sanitize_textarea_field($message_input_string);

    $field_errors_array = [];

    // imie i nazwisko
    if ($sanitized_name_string === "" || mb_strlen($sanitized_name_string) < ASKEE_TICKET_NAME_MIN_LENGTH) {
        $field_errors_array["name"] = sprintf(
            "Podaj imię i nazwisko (min. %d znaki).",
            (int) ASKEE_TICKET_NAME_MIN_LENGTH
        );
    } elseif (mb_strlen($sanitized_name_string) > ASKEE_TICKET_NAME_MAX_LENGTH) {
        $field_errors_array["name"] = sprintf(
            "Imię i nazwisko jest za długie (max %d znaków).",
            (int) ASKEE_TICKET_NAME_MAX_LENGTH
        );
    }

    // email
    if ($sanitized_email_string === "" || !is_email($sanitized_email_string)) {
        $field_errors_array["email"] = "Podaj poprawny adres e-mail.";
    } elseif (mb_strlen($sanitized_email_string) > ASKEE_TICKET_EMAIL_MAX_LENGTH) {
        $field_errors_array["email"] = "Adres e-mail jest za długi.";
    }

    // telefon — opcjonalny: jesli user wpisal cokolwiek ale niepoprawnego, blad
    $phone_raw_trimmed = trim((string) $phone_input_string);
    if ($phone_raw_trimmed !== "" && $normalized_phone_string === "") {
        $field_errors_array["phone"] = "Podaj poprawny numer telefonu lub zostaw pole puste.";
    }

    // nazwa firmy — wymagana
    if ($sanitized_company_string === "" || mb_strlen($sanitized_company_string) < ASKEE_TICKET_COMPANY_MIN_LENGTH) {
        $field_errors_array["company"] = sprintf(
            "Podaj nazwę firmy (min. %d znaki).",
            (int) ASKEE_TICKET_COMPANY_MIN_LENGTH
        );
    } elseif (mb_strlen($sanitized_company_string) > ASKEE_TICKET_COMPANY_MAX_LENGTH) {
        $field_errors_array["company"] = sprintf(
            "Nazwa firmy jest za długa (max %d znaków).",
            (int) ASKEE_TICKET_COMPANY_MAX_LENGTH
        );
    }

    // stanowisko — wymagane
    if ($sanitized_position_string === "" || mb_strlen($sanitized_position_string) < ASKEE_TICKET_POSITION_MIN_LENGTH) {
        $field_errors_array["position"] = sprintf(
            "Podaj stanowisko (min. %d znaki).",
            (int) ASKEE_TICKET_POSITION_MIN_LENGTH
        );
    } elseif (mb_strlen($sanitized_position_string) > ASKEE_TICKET_POSITION_MAX_LENGTH) {
        $field_errors_array["position"] = sprintf(
            "Stanowisko jest za długie (max %d znaków).",
            (int) ASKEE_TICKET_POSITION_MAX_LENGTH
        );
    }

    // kategoria — musi byc ze stalego slownika
    $allowed_categories_map = askee_ticket_get_categories_map();
    if (!array_key_exists($sanitized_category_string, $allowed_categories_map)) {
        $field_errors_array["category"] = "Wybierz kategorię zgłoszenia.";
    }

    // numer poprzedniego ticketu — pole opcjonalne, ale jak wpisane to musi pasowac
    if ($sanitized_previous_ticket_string !== "") {
        if (!preg_match(askee_ticket_get_number_regex_pattern(), $sanitized_previous_ticket_string)) {
            $field_errors_array["previous_ticket_number"] = "Numer poprzedniego zgłoszenia ma niepoprawny format (np. ASK-2026-0001).";
        }
    }

    // tresc
    if ($sanitized_message_string === "" || mb_strlen($sanitized_message_string) < ASKEE_TICKET_MESSAGE_MIN_LENGTH) {
        $field_errors_array["message"] = sprintf(
            "Treść jest za krótka (min. %d znaków).",
            (int) ASKEE_TICKET_MESSAGE_MIN_LENGTH
        );
    } elseif (mb_strlen($sanitized_message_string) > ASKEE_TICKET_MESSAGE_MAX_LENGTH) {
        $field_errors_array["message"] = sprintf(
            "Treść jest za długa (max %d znaków).",
            (int) ASKEE_TICKET_MESSAGE_MAX_LENGTH
        );
    }

    // zgoda RODO
    $consent_normalized_string = strtolower(trim((string) $consent_input_value));
    $consent_accepted_boolean = in_array($consent_normalized_string, ["1", "true", "yes", "on"], true);
    if (!$consent_accepted_boolean) {
        $field_errors_array["consent"] = "Wymagana jest zgoda na przetwarzanie danych zgodnie z polityką prywatności.";
    }

    // wstepna walidacja zalacznikow PRZED utworzeniem postu (zeby nie tworzyc smieci)
    // dokladna walidacja MIME/wp_handle_upload dzieje sie pozniej w askee_ticket_handle_single_file_upload
    $attachment_files_array = askee_ticket_collect_uploaded_files();
    if (count($attachment_files_array) > ASKEE_TICKET_ATTACHMENT_MAX_COUNT) {
        $field_errors_array["attachments"] = sprintf(
            "Możesz dodać maksymalnie %d załączników.",
            (int) ASKEE_TICKET_ATTACHMENT_MAX_COUNT
        );
    }

    if (!empty($field_errors_array)) {
        return new WP_REST_Response(
            ["ok" => false, "error" => "validation_failed", "fields" => $field_errors_array],
            422
        );
    }

    // rate limit (IP najpierw, sesja jako bonus)
    $ip_rate_limit_result = askee_ticket_check_and_update_ip_rate_limit();
    if (!empty($ip_rate_limit_result["is_blocked"])) {
        $minutes_left = max(1, (int) ($ip_rate_limit_result["minutes_left"] ?? 1));
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "rate_limited",
                "message" => sprintf("Przekroczono limit zgłoszeń. Spróbuj ponownie za %d min.", $minutes_left),
                "minutes_left" => $minutes_left,
            ],
            429
        );
    }

    askee_ticket_get_or_start_session_id();
    if (session_status() === PHP_SESSION_ACTIVE) {
        $session_rate_limit_result = askee_ticket_check_and_update_rate_limit();
        if (!empty($session_rate_limit_result["is_blocked"])) {
            $minutes_left = max(1, (int) ($session_rate_limit_result["minutes_left"] ?? 1));
            return new WP_REST_Response(
                [
                    "ok" => false,
                    "error" => "rate_limited",
                    "message" => sprintf("Przekroczono limit zgłoszeń. Spróbuj ponownie za %d min.", $minutes_left),
                    "minutes_left" => $minutes_left,
                ],
                429
            );
        }
    }

    // generujemy numer ticketu i tworzymy CPT post
    $ticket_number_string = askee_ticket_generate_next_number();
    $user_identifier_hash = askee_ticket_build_user_identifier_hash(
        $sanitized_email_string,
        $sanitized_name_string
    );

    $ticket_post_data_array = [
        "post_type" => ASKEE_TICKET_CPT_SLUG,
        "post_status" => askee_ticket_get_default_status_slug(),
        "post_title" => $ticket_number_string,
        "post_content" => $sanitized_message_string,
    ];

    $ticket_post_id = wp_insert_post($ticket_post_data_array, true);
    if (is_wp_error($ticket_post_id) || $ticket_post_id <= 0) {
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "create_failed",
                "message" => "Nie udało się utworzyć zgłoszenia. Spróbuj ponownie później.",
            ],
            500
        );
    }

    // metadane ticketu — single source of truth dla widoku adminowego i CSV
    update_post_meta($ticket_post_id, "_askee_ticket_number", $ticket_number_string);
    update_post_meta($ticket_post_id, "_askee_ticket_name", $sanitized_name_string);
    update_post_meta($ticket_post_id, "_askee_ticket_email", $sanitized_email_string);
    update_post_meta($ticket_post_id, "_askee_ticket_phone", $normalized_phone_string);
    update_post_meta($ticket_post_id, "_askee_ticket_company", $sanitized_company_string);
    update_post_meta($ticket_post_id, "_askee_ticket_position", $sanitized_position_string);
    update_post_meta($ticket_post_id, "_askee_ticket_category", $sanitized_category_string);
    update_post_meta($ticket_post_id, "_askee_ticket_previous_number", $sanitized_previous_ticket_string);
    update_post_meta($ticket_post_id, "_askee_ticket_user_identifier", $user_identifier_hash);
    update_post_meta($ticket_post_id, "_askee_ticket_submission_ip", askee_ticket_get_request_ip_address());
    update_post_meta($ticket_post_id, "_askee_ticket_submission_user_agent", isset($_SERVER["HTTP_USER_AGENT"])
        ? sanitize_text_field((string) $_SERVER["HTTP_USER_AGENT"])
        : "");

    // upload zalacznikow PO stworzeniu postu (potrzebne post_parent)
    $uploaded_attachment_ids_array = [];
    $attachment_errors_array = [];
    foreach ($attachment_files_array as $single_file_entry_array) {
        $single_upload_result = askee_ticket_handle_single_file_upload($single_file_entry_array, $ticket_post_id);
        if (!empty($single_upload_result["ok"])) {
            $uploaded_attachment_ids_array[] = (int) $single_upload_result["attachment_id"];
        } else {
            $attachment_errors_array[] = (string) ($single_upload_result["error"] ?? "Nieznany błąd uploadu.");
        }
    }

    // poprzednie zgloszenia tego usera — uzywane w mailu i meta box
    $previous_tickets_count = askee_ticket_count_previous_tickets_for_user(
        $user_identifier_hash,
        $ticket_post_id
    );

    // wysylka maila do nas (per-recipient zeby pojedyncza awaria nie zabila reszty)
    $any_recipient_delivered_boolean = askee_ticket_send_internal_notification_email(
        $ticket_post_id,
        $ticket_number_string,
        $sanitized_name_string,
        $sanitized_email_string,
        $normalized_phone_string,
        $sanitized_company_string,
        $sanitized_position_string,
        $sanitized_category_string,
        $sanitized_previous_ticket_string,
        $sanitized_message_string,
        $uploaded_attachment_ids_array,
        $previous_tickets_count
    );

    // wysylka maila potwierdzajacego do usera (z numerem ticketu)
    askee_ticket_send_user_confirmation_email(
        $sanitized_email_string,
        $sanitized_name_string,
        $ticket_number_string
    );

    if (!$any_recipient_delivered_boolean) {
        // post jest juz w bazie — usera informujemy o ostrzezeniu ale 200 (nie 500),
        // zeby user nie wysylal trzy razy. Admin zobaczy ticket w panelu i tak.
        return new WP_REST_Response(
            [
                "ok" => true,
                "status" => "delivered_with_warnings",
                "ticket_number" => $ticket_number_string,
                "message" => sprintf(
                    "Zgłoszenie #%s zostało zapisane. Skontaktujemy się z Tobą wkrótce.",
                    $ticket_number_string
                ),
                "attachment_errors" => $attachment_errors_array,
            ],
            200
        );
    }

    return new WP_REST_Response(
        [
            "ok" => true,
            "status" => "delivered",
            "ticket_number" => $ticket_number_string,
            "message" => sprintf(
                "Dziękujemy! Zgłoszenie zostało zarejestrowane. Numer: %s",
                $ticket_number_string
            ),
            "attachment_errors" => $attachment_errors_array,
        ],
        200
    );
}

// zbiera pliki z $_FILES["attachments"] (HTML multi-file input) do listy
// pojedynczych entries jakich oczekuje wp_handle_upload
function askee_ticket_collect_uploaded_files() {
    if (!isset($_FILES["attachments"]) || !is_array($_FILES["attachments"])) {
        return [];
    }

    $multi_files_array = $_FILES["attachments"];
    if (
        !isset($multi_files_array["name"], $multi_files_array["tmp_name"], $multi_files_array["error"]) ||
        !is_array($multi_files_array["name"])
    ) {
        return [];
    }

    $files_count = count($multi_files_array["name"]);
    $collected_files_array = [];

    for ($index = 0; $index < $files_count; $index += 1) {
        // pomijamy puste sloty (user dodal np 2 z 3 mozliwych)
        if (
            empty($multi_files_array["name"][$index]) ||
            (int) ($multi_files_array["error"][$index] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE
        ) {
            continue;
        }

        $collected_files_array[] = [
            "name" => $multi_files_array["name"][$index],
            "type" => $multi_files_array["type"][$index] ?? "",
            "tmp_name" => $multi_files_array["tmp_name"][$index] ?? "",
            "error" => (int) ($multi_files_array["error"][$index] ?? UPLOAD_ERR_NO_FILE),
            "size" => (int) ($multi_files_array["size"][$index] ?? 0),
        ];
    }

    return $collected_files_array;
}

// liczy ile poprzednich ticketow ma dany user (po hash), wykluczajac aktualny
function askee_ticket_count_previous_tickets_for_user($user_identifier_hash_string, $current_ticket_post_id) {
    if (!is_string($user_identifier_hash_string) || $user_identifier_hash_string === "") {
        return 0;
    }

    $query_args_array = [
        "post_type" => ASKEE_TICKET_CPT_SLUG,
        "post_status" => array_keys(askee_ticket_get_statuses_map()),
        "posts_per_page" => -1,
        "fields" => "ids",
        "post__not_in" => [(int) $current_ticket_post_id],
        "meta_query" => [
            [
                "key" => "_askee_ticket_user_identifier",
                "value" => $user_identifier_hash_string,
                "compare" => "=",
            ],
        ],
        "no_found_rows" => true,
        "update_post_meta_cache" => false,
        "update_post_term_cache" => false,
    ];

    $previous_query = new WP_Query($query_args_array);
    return (int) $previous_query->post_count;
}

// =============================================================================
// 9. MAILING (do nas + potwierdzenie do usera)
// =============================================================================

// wysylka maila wewnetrznego — uzywa tej samej listy odbiorcow co contact-form
// (single source of truth: askee_contact_get_recipient_emails_array)
function askee_ticket_send_internal_notification_email(
    $ticket_post_id,
    $ticket_number_string,
    $name_string,
    $email_string,
    $phone_string,
    $company_string,
    $position_string,
    $category_slug_string,
    $previous_ticket_number_string,
    $message_string,
    $attachment_ids_array,
    $previous_tickets_count
) {
    if (!function_exists("askee_contact_get_recipient_emails_array")) {
        // contact-form.php nie zaladowany — log i 0 odbiorcow
        if (function_exists("error_log")) {
            error_log(
                "[Askee tickets] askee_contact_get_recipient_emails_array() not available — " .
                    "recipients list missing, internal mail skipped."
            );
        }
        return false;
    }

    $recipient_emails_array = askee_contact_get_recipient_emails_array();
    if (empty($recipient_emails_array)) {
        return false;
    }

    $site_name_string = (string) wp_specialchars_decode(get_bloginfo("name"), ENT_QUOTES);
    $site_host_string = (string) wp_parse_url(home_url(), PHP_URL_HOST);

    $from_email_string = defined("ASKEE_SMTP_FROM_EMAIL")
        ? (string) ASKEE_SMTP_FROM_EMAIL
        : "noreply@" . $site_host_string;
    $from_name_string = defined("ASKEE_SMTP_FROM_NAME")
        ? (string) ASKEE_SMTP_FROM_NAME
        : ($site_name_string !== "" ? $site_name_string : "Askee");

    $categories_map = askee_ticket_get_categories_map();
    $category_label_string = $categories_map[$category_slug_string] ?? $category_slug_string;

    $request_ip_string = askee_ticket_get_request_ip_address();
    $user_agent_string = isset($_SERVER["HTTP_USER_AGENT"])
        ? sanitize_text_field((string) $_SERVER["HTTP_USER_AGENT"])
        : "";

    $edit_url_string = admin_url("post.php?post=" . (int) $ticket_post_id . "&action=edit");

    $attachment_urls_array = [];
    foreach ($attachment_ids_array as $single_attachment_id) {
        $single_attachment_url = wp_get_attachment_url((int) $single_attachment_id);
        if (is_string($single_attachment_url) && $single_attachment_url !== "") {
            $attachment_urls_array[] = $single_attachment_url;
        }
    }

    $email_subject_string = sprintf(
        "[Askee — zgłoszenia] Nowe zgłoszenie #%s — %s",
        $ticket_number_string,
        $category_label_string
    );

    // tresc HTML — szablon wspolny (helpery w lib/functions/smtp.php)
    if (function_exists("askee_email_html_wrap")) {
        $email_inner_html_string =
            askee_email_html_paragraph("Nowe zgłoszenie z formularza ticketowego na stronie Askee.") .
            askee_email_html_data_table([
                ["Numer", $ticket_number_string],
                ["Kategoria", $category_label_string],
                ["Imię i nazwisko", $name_string],
                ["E-mail", $email_string],
                ["Telefon", $phone_string],
                ["Firma", $company_string],
                ["Stanowisko", $position_string],
                ["Nawiązuje do", $previous_ticket_number_string],
                ["Wcześniejszych zgłoszeń", (string) (int) $previous_tickets_count],
            ]) .
            askee_email_html_message_block("Treść zgłoszenia", $message_string);

        if (!empty($attachment_urls_array)) {
            $colors_array = askee_email_brand_colors();
            $font_stack_string = askee_email_font_stack();
            $attachments_html_string =
                '<div style="margin:20px 0;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:' .
                $colors_array["gray"] . ";margin-bottom:7px;font-family:" . $font_stack_string . ';">Załączniki</div>';
            foreach ($attachment_urls_array as $single_attachment_url) {
                $attachments_html_string .=
                    '<div style="margin:4px 0;font-size:14px;font-family:' . $font_stack_string . ';">' .
                    '<a href="' . esc_url($single_attachment_url) . '" style="color:' . $colors_array["theme"] .
                    ';word-break:break-all;">' . esc_html($single_attachment_url) . "</a></div>";
            }
            $attachments_html_string .= "</div>";
            $email_inner_html_string .= $attachments_html_string;
        }

        $email_inner_html_string .= askee_email_html_button("Zarządzaj w wp-admin", $edit_url_string);
        $email_inner_html_string .= askee_email_html_meta([
            "Data: " . wp_date("Y-m-d H:i:s"),
            "IP: " . ($request_ip_string !== "" ? $request_ip_string : "n/d"),
            "User-Agent: " . ($user_agent_string !== "" ? $user_agent_string : "n/d"),
        ]);

        $email_body_string = askee_email_html_wrap(
            sprintf("Nowe zgłoszenie #%s", $ticket_number_string),
            $email_inner_html_string
        );
        $email_content_type_header_string = "Content-Type: text/html; charset=UTF-8";
    } else {
        // fallback plain text gdyby smtp.php nie byl zaladowany
        $email_body_lines_array = [
            "Nowe zgłoszenie z formularza na " . home_url("/zgloszenia/"),
            "",
            "Numer: " . $ticket_number_string,
            "Kategoria: " . $category_label_string,
            "Imię i nazwisko: " . $name_string,
            "E-mail: " . $email_string,
            "Telefon: " . ($phone_string !== "" ? $phone_string : "(nie podano)"),
            "Firma: " . ($company_string !== "" ? $company_string : "(nie podano)"),
            "Stanowisko: " . ($position_string !== "" ? $position_string : "(nie podano)"),
            "Nawiązuje do zgłoszenia: " . ($previous_ticket_number_string !== "" ? $previous_ticket_number_string : "(brak)"),
            "Wcześniejszych zgłoszeń tego użytkownika: " . (int) $previous_tickets_count,
            "",
            "Treść:",
            $message_string,
            "",
        ];
        if (!empty($attachment_urls_array)) {
            $email_body_lines_array[] = "Załączniki:";
            foreach ($attachment_urls_array as $single_attachment_url) {
                $email_body_lines_array[] = " - " . $single_attachment_url;
            }
            $email_body_lines_array[] = "";
        }
        $email_body_lines_array[] = "—";
        $email_body_lines_array[] = "Zarządzaj w wp-admin: " . $edit_url_string;
        $email_body_lines_array[] = "Data: " . wp_date("Y-m-d H:i:s");
        $email_body_lines_array[] = "IP: " . ($request_ip_string !== "" ? $request_ip_string : "n/d");
        $email_body_lines_array[] = "User-Agent: " . ($user_agent_string !== "" ? $user_agent_string : "n/d");
        $email_body_string = implode("\n", $email_body_lines_array);
        $email_content_type_header_string = "Content-Type: text/plain; charset=UTF-8";
    }

    $email_headers_array = [
        $email_content_type_header_string,
        sprintf("From: %s <%s>", $from_name_string, $from_email_string),
        sprintf("Reply-To: %s <%s>", $name_string, $email_string),
    ];

    // per-recipient — tak jak w contact-form, izoluje awarie pojedynczego SMTP recipient
    $any_recipient_delivered_boolean = false;
    $failed_recipients_array_for_log = [];

    foreach ($recipient_emails_array as $individual_recipient_email_string) {
        $send_result_boolean = wp_mail(
            $individual_recipient_email_string,
            $email_subject_string,
            $email_body_string,
            $email_headers_array
        );
        if ($send_result_boolean) {
            $any_recipient_delivered_boolean = true;
        } else {
            $failed_recipients_array_for_log[] = $individual_recipient_email_string;
        }
    }

    if (!empty($failed_recipients_array_for_log) && function_exists("error_log")) {
        error_log(
            "[Askee tickets] partial delivery for ticket " . $ticket_number_string .
                " — failed recipients: " . implode(", ", $failed_recipients_array_for_log)
        );
    }

    return $any_recipient_delivered_boolean;
}

// wysylka maila potwierdzajacego do usera (z numerem ticketu)
// Reply-To = nasz wp_mail_from zeby odpowiedz usera nie szla w prozni
function askee_ticket_send_user_confirmation_email(
    $email_string,
    $name_string,
    $ticket_number_string
) {
    if ($email_string === "" || !is_email($email_string)) {
        return false;
    }

    $site_host_string = (string) wp_parse_url(home_url(), PHP_URL_HOST);
    $from_email_string = defined("ASKEE_SMTP_FROM_EMAIL")
        ? (string) ASKEE_SMTP_FROM_EMAIL
        : "noreply@" . $site_host_string;
    $from_name_string = defined("ASKEE_SMTP_FROM_NAME")
        ? (string) ASKEE_SMTP_FROM_NAME
        : "Askee";

    $email_subject_string = sprintf("Potwierdzenie zgłoszenia #%s", $ticket_number_string);

    // baza wiedzy — absolutny URL (stala moze byc sciezka wzgledna typu "/faq/")
    $knowledge_base_raw_value = (string) ASKEE_TICKET_KNOWLEDGE_BASE_URL;
    $knowledge_base_url_string = preg_match('#^https?://#i', $knowledge_base_raw_value)
        ? $knowledge_base_raw_value
        : home_url($knowledge_base_raw_value);

    if (function_exists("askee_email_html_wrap")) {
        $colors_array = askee_email_brand_colors();
        $font_stack_string = askee_email_font_stack();

        // wyrozniony box z numerem zgloszenia
        $ticket_number_box_html =
            '<div style="margin:18px 0;background:' . $colors_array["theme_light"] .
            ';border-radius:10px;padding:18px 20px;text-align:center;font-family:' . $font_stack_string . ';">' .
            '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:' .
            $colors_array["theme"] . ';">Numer Twojego zgłoszenia</div>' .
            '<div style="font-size:26px;font-weight:700;color:' . $colors_array["theme"] .
            ';margin-top:4px;letter-spacing:0.02em;">' . esc_html($ticket_number_string) . "</div>" .
            "</div>";

        $email_inner_html_string =
            askee_email_html_paragraph("Dzień dobry <strong>" . esc_html($name_string) . "</strong>,") .
            askee_email_html_paragraph("dziękujemy za przesłanie zgłoszenia. Przyjęliśmy je do obsługi.") .
            $ticket_number_box_html .
            askee_email_html_paragraph(
                "Zachowaj ten numer — jeśli będziesz chciał kontynuować sprawę, podaj go w polu " .
                    "<strong>„numer poprzedniego zgłoszenia”</strong> przy kolejnym kontakcie."
            ) .
            askee_email_html_paragraph("Odezwiemy się najszybciej, jak to możliwe.") .
            askee_email_html_paragraph(
                "W międzyczasie zajrzyj do bazy wiedzy i instrukcji — być może rozwiązanie jest już opisane:"
            ) .
            askee_email_html_button("Otwórz bazę wiedzy", $knowledge_base_url_string) .
            askee_email_html_paragraph("Pozdrawiamy,<br>Zespół Askee");

        $email_body_string = askee_email_html_wrap(
            sprintf("Potwierdzenie zgłoszenia #%s", $ticket_number_string),
            $email_inner_html_string
        );
        $email_content_type_header_string = "Content-Type: text/html; charset=UTF-8";
    } else {
        // fallback plain text gdyby smtp.php nie byl zaladowany
        $email_body_string = implode("\n", [
            sprintf("Dzień dobry %s,", $name_string),
            "",
            sprintf(
                "dziękujemy za przesłanie zgłoszenia. Twój numer zgłoszenia to: %s.",
                $ticket_number_string
            ),
            "Zachowaj ten numer — jeśli będziesz chciał kontynuować sprawę, podaj go w polu \"numer poprzedniego zgłoszenia\" przy kolejnym kontakcie.",
            "",
            "Odezwiemy się najszybciej, jak to możliwe.",
            "W międzyczasie zajrzyj do bazy wiedzy i instrukcji — być może rozwiązanie jest już opisane:",
            $knowledge_base_url_string,
            "",
            "Pozdrawiamy,",
            "Zespół Askee",
        ]);
        $email_content_type_header_string = "Content-Type: text/plain; charset=UTF-8";
    }

    $email_headers_array = [
        $email_content_type_header_string,
        sprintf("From: %s <%s>", $from_name_string, $from_email_string),
        sprintf("Reply-To: %s <%s>", $from_name_string, $from_email_string),
    ];

    return wp_mail($email_string, $email_subject_string, $email_body_string, $email_headers_array);
}

// =============================================================================
// 10. PANEL ADMINA — kolumny, filtry, quick edit, meta boxes, eksport CSV
// =============================================================================

// kolumny na liscie ticketow
add_filter("manage_" . ASKEE_TICKET_CPT_SLUG . "_posts_columns", "askee_ticket_admin_columns");
function askee_ticket_admin_columns($columns_array) {
    // przebudowujemy w okreslonej kolejnosci (cb checkbox, numer, ...,date)
    $new_columns_array = [
        "cb" => $columns_array["cb"] ?? "",
        "askee_ticket_number" => "Numer",
        "askee_ticket_name" => "Imię i nazwisko",
        "askee_ticket_email" => "E-mail",
        "askee_ticket_category" => "Kategoria",
        "askee_ticket_status" => "Status",
        "askee_ticket_history" => "Historia",
        "date" => "Data",
    ];

    return $new_columns_array;
}

// wartosci kolumn
add_action("manage_" . ASKEE_TICKET_CPT_SLUG . "_posts_custom_column", "askee_ticket_admin_column_value", 10, 2);
function askee_ticket_admin_column_value($column_name_string, $post_id) {
    switch ($column_name_string) {
        case "askee_ticket_number":
            $ticket_number = (string) get_post_meta($post_id, "_askee_ticket_number", true);
            $edit_url = admin_url("post.php?post=" . (int) $post_id . "&action=edit");
            echo '<a href="' . esc_url($edit_url) . '"><strong>' . esc_html($ticket_number) . "</strong></a>";
            break;

        case "askee_ticket_name":
            echo esc_html((string) get_post_meta($post_id, "_askee_ticket_name", true));
            break;

        case "askee_ticket_email":
            $email_value = (string) get_post_meta($post_id, "_askee_ticket_email", true);
            if ($email_value !== "") {
                echo '<a href="mailto:' . esc_attr($email_value) . '">' . esc_html($email_value) . "</a>";
            } else {
                echo "—";
            }
            break;

        case "askee_ticket_category":
            $category_slug = (string) get_post_meta($post_id, "_askee_ticket_category", true);
            $categories_map = askee_ticket_get_categories_map();
            echo esc_html($categories_map[$category_slug] ?? "—");
            break;

        case "askee_ticket_status":
            $current_status = (string) get_post_status($post_id);
            $statuses_map = askee_ticket_get_statuses_map();
            $status_label = $statuses_map[$current_status] ?? $current_status;
            echo '<span class="askee-ticket-status-badge askee-ticket-status-' .
                esc_attr($current_status) .
                '">' .
                esc_html($status_label) .
                "</span>";
            break;

        case "askee_ticket_history":
            $user_hash = (string) get_post_meta($post_id, "_askee_ticket_user_identifier", true);
            $previous_count = askee_ticket_count_previous_tickets_for_user($user_hash, $post_id);
            echo esc_html((string) $previous_count);
            break;
    }
}

// styling badge'ow statusow na liscie + dropdown statusu (sidebar i quick edit)
add_action("admin_enqueue_scripts", "askee_ticket_admin_assets");
function askee_ticket_admin_assets($hook_suffix_string) {
    $screen = get_current_screen();
    if (!$screen || $screen->post_type !== ASKEE_TICKET_CPT_SLUG) {
        return;
    }

    // inline CSS (krotkie, nie warto osobnego pliku)
    $badge_css_string = "
        .askee-ticket-status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px;
            font-size: 11px; font-weight: 600; line-height: 1.4; text-transform: uppercase;
            letter-spacing: 0.04em; }
        .askee-ticket-status-ask_open { background:#fff4d6;color:#7a5b00; }
        .askee-ticket-status-ask_progress { background:#d6e9ff;color:#0a3d80; }
        .askee-ticket-status-ask_waiting { background:#f3e5ff;color:#5a1d8a; }
        .askee-ticket-status-ask_resolved { background:#d8f3df;color:#1f5631; }
        .askee-ticket-status-ask_closed { background:#e3e3e3;color:#444; }
        .askee-ticket-history-list li { margin: 4px 0; }
        .askee-ticket-meta-table th { text-align:left;padding:4px 12px 4px 0;font-weight:600;width:180px; }
        .askee-ticket-meta-table td { padding:4px 0; }
    ";
    wp_register_style("askee-ticket-admin", false);
    wp_enqueue_style("askee-ticket-admin");
    wp_add_inline_style("askee-ticket-admin", $badge_css_string);

    // JS: 1) dropdown statusu w sidebar edytora (Classic), 2) preselect w quick edit
    $statuses_map = askee_ticket_get_statuses_map();
    $statuses_json = wp_json_encode($statuses_map);

    $admin_js_string = <<<JS
        (function() {
            var statusesMap = {$statuses_json};

            // 1) Classic editor: WP nie dodaje custom statusow do <select id="post_status">,
            // wiec dorzucamy je sami i ustawiamy aktualnie wybrany.
            function injectStatusOptionsIntoClassicEditor() {
                var statusSelect = document.querySelector('#post_status');
                if (!statusSelect) return;
                var currentStatus = (document.querySelector('#hidden_post_status') || {}).value || '';

                var existingValues = {};
                for (var i = 0; i < statusSelect.options.length; i++) {
                    existingValues[statusSelect.options[i].value] = true;
                }

                Object.keys(statusesMap).forEach(function(statusSlug) {
                    if (existingValues[statusSlug]) return;
                    var optionElement = document.createElement('option');
                    optionElement.value = statusSlug;
                    optionElement.textContent = statusesMap[statusSlug];
                    statusSelect.appendChild(optionElement);
                });

                if (currentStatus && statusesMap[currentStatus]) {
                    statusSelect.value = currentStatus;
                    var displaySpan = document.querySelector('#post-status-display');
                    if (displaySpan) {
                        displaySpan.textContent = statusesMap[currentStatus];
                    }
                }
            }

            // 2) quick edit: zaladowanie biezacego statusu do dropdownu w wierszu
            if (typeof window.inlineEditPost !== 'undefined') {
                var originalEditFunction = window.inlineEditPost.edit;
                window.inlineEditPost.edit = function(postId) {
                    originalEditFunction.apply(this, arguments);
                    var postIdNumber = typeof(postId) === 'object' ? this.getId(postId) : postId;
                    var editRow = document.querySelector('#edit-' + postIdNumber);
                    var postRow = document.querySelector('#post-' + postIdNumber);
                    if (!editRow || !postRow) return;

                    var statusBadge = postRow.querySelector('.askee-ticket-status-badge');
                    if (!statusBadge) return;

                    var matchingClassName = '';
                    statusBadge.classList.forEach(function(className) {
                        if (className.indexOf('askee-ticket-status-ask_') === 0) {
                            matchingClassName = className.replace('askee-ticket-status-', '');
                        }
                    });

                    if (!matchingClassName) return;

                    var dropdown = editRow.querySelector('select[name="askee_ticket_quick_edit_status"]');
                    if (dropdown) dropdown.value = matchingClassName;
                };
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', injectStatusOptionsIntoClassicEditor);
            } else {
                injectStatusOptionsIntoClassicEditor();
            }
        })();
JS;

    wp_register_script("askee-ticket-admin", "", [], false, true);
    wp_enqueue_script("askee-ticket-admin");
    wp_add_inline_script("askee-ticket-admin", $admin_js_string);
}

// quick edit: dropdown statusu w panelu szybkiej edycji
add_action("quick_edit_custom_box", "askee_ticket_quick_edit_status_box", 10, 2);
function askee_ticket_quick_edit_status_box($column_name_string, $post_type_string) {
    if ($post_type_string !== ASKEE_TICKET_CPT_SLUG) {
        return;
    }
    if ($column_name_string !== "askee_ticket_status") {
        return;
    }

    $statuses_map = askee_ticket_get_statuses_map();

    echo '<fieldset class="inline-edit-col-right"><div class="inline-edit-col">';
    echo '<label class="inline-edit-status alignleft">';
    echo '<span class="title">Status</span>';
    echo '<select name="askee_ticket_quick_edit_status">';
    foreach ($statuses_map as $status_slug => $status_label) {
        echo '<option value="' . esc_attr($status_slug) . '">' . esc_html($status_label) . "</option>";
    }
    echo "</select></label>";
    wp_nonce_field("askee_ticket_quick_edit_nonce", "askee_ticket_quick_edit_nonce");
    echo "</div></fieldset>";
}

// save_post: obsluga zmiany statusu z quick edit i z sidebar editora
add_action("save_post_" . ASKEE_TICKET_CPT_SLUG, "askee_ticket_save_quick_edit_status", 10, 2);
function askee_ticket_save_quick_edit_status($post_id, $post_object) {
    // pomijamy autozapisy i rewizje
    if (defined("DOING_AUTOSAVE") && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;
    if (!current_user_can("edit_post", $post_id)) return;

    // nonce z quick edit (jak jest, to przeszlo quick edit)
    if (
        isset($_POST["askee_ticket_quick_edit_nonce"]) &&
        wp_verify_nonce(sanitize_text_field((string) $_POST["askee_ticket_quick_edit_nonce"]), "askee_ticket_quick_edit_nonce")
    ) {
        $new_status_string = isset($_POST["askee_ticket_quick_edit_status"])
            ? sanitize_text_field((string) $_POST["askee_ticket_quick_edit_status"])
            : "";

        $allowed_statuses_array = array_keys(askee_ticket_get_statuses_map());
        if (in_array($new_status_string, $allowed_statuses_array, true) && $new_status_string !== $post_object->post_status) {
            // wp_update_post zeby przeszlo przez transition_post_status hooks
            wp_update_post([
                "ID" => $post_id,
                "post_status" => $new_status_string,
            ]);
        }
    }
}

// filtr w toolbar listy ticketow: dropdown statusu i kategorii
add_action("restrict_manage_posts", "askee_ticket_admin_list_filters");
function askee_ticket_admin_list_filters($post_type_string) {
    if ($post_type_string !== ASKEE_TICKET_CPT_SLUG) {
        return;
    }

    // status
    $statuses_map = askee_ticket_get_statuses_map();
    $current_status_filter = isset($_GET["askee_ticket_status_filter"])
        ? sanitize_text_field((string) $_GET["askee_ticket_status_filter"])
        : "";
    echo '<select name="askee_ticket_status_filter">';
    echo '<option value="">Wszystkie statusy</option>';
    foreach ($statuses_map as $status_slug => $status_label) {
        $selected_attribute = selected($current_status_filter, $status_slug, false);
        echo '<option value="' . esc_attr($status_slug) . '" ' . $selected_attribute . ">" . esc_html($status_label) . "</option>";
    }
    echo "</select>";

    // kategoria
    $categories_map = askee_ticket_get_categories_map();
    $current_category_filter = isset($_GET["askee_ticket_category_filter"])
        ? sanitize_text_field((string) $_GET["askee_ticket_category_filter"])
        : "";
    echo '<select name="askee_ticket_category_filter">';
    echo '<option value="">Wszystkie kategorie</option>';
    foreach ($categories_map as $cat_slug => $cat_label) {
        $selected_attribute = selected($current_category_filter, $cat_slug, false);
        echo '<option value="' . esc_attr($cat_slug) . '" ' . $selected_attribute . ">" . esc_html($cat_label) . "</option>";
    }
    echo "</select>";
}

// stosuje filtry do glownego query w admin listy
add_filter("parse_query", "askee_ticket_apply_admin_filters");
function askee_ticket_apply_admin_filters($query) {
    global $pagenow;

    if (!is_admin() || $pagenow !== "edit.php") {
        return $query;
    }

    $current_post_type = isset($_GET["post_type"]) ? sanitize_text_field((string) $_GET["post_type"]) : "";
    if ($current_post_type !== ASKEE_TICKET_CPT_SLUG) {
        return $query;
    }

    $query_vars_reference = &$query->query_vars;

    // status filtr
    $status_filter_value = isset($_GET["askee_ticket_status_filter"])
        ? sanitize_text_field((string) $_GET["askee_ticket_status_filter"])
        : "";
    if ($status_filter_value !== "" && array_key_exists($status_filter_value, askee_ticket_get_statuses_map())) {
        $query_vars_reference["post_status"] = $status_filter_value;
    }

    // kategoria filtr (meta_query)
    $category_filter_value = isset($_GET["askee_ticket_category_filter"])
        ? sanitize_text_field((string) $_GET["askee_ticket_category_filter"])
        : "";
    if ($category_filter_value !== "" && array_key_exists($category_filter_value, askee_ticket_get_categories_map())) {
        $existing_meta_query = isset($query_vars_reference["meta_query"]) && is_array($query_vars_reference["meta_query"])
            ? $query_vars_reference["meta_query"]
            : [];
        $existing_meta_query[] = [
            "key" => "_askee_ticket_category",
            "value" => $category_filter_value,
            "compare" => "=",
        ];
        $query_vars_reference["meta_query"] = $existing_meta_query;
    }

    return $query;
}

// meta boxy w edycji ticketu
add_action("add_meta_boxes_" . ASKEE_TICKET_CPT_SLUG, "askee_ticket_register_meta_boxes");
function askee_ticket_register_meta_boxes() {
    add_meta_box(
        "askee_ticket_details_meta_box",
        "Dane zgłaszającego",
        "askee_ticket_render_details_meta_box",
        ASKEE_TICKET_CPT_SLUG,
        "normal",
        "high"
    );

    add_meta_box(
        "askee_ticket_history_meta_box",
        "Historia tego użytkownika",
        "askee_ticket_render_history_meta_box",
        ASKEE_TICKET_CPT_SLUG,
        "side",
        "default"
    );

    add_meta_box(
        "askee_ticket_attachments_meta_box",
        "Załączniki",
        "askee_ticket_render_attachments_meta_box",
        ASKEE_TICKET_CPT_SLUG,
        "normal",
        "default"
    );

    add_meta_box(
        "askee_ticket_internal_notes_meta_box",
        "Notatki wewnętrzne (tylko zespół)",
        "askee_ticket_render_internal_notes_meta_box",
        ASKEE_TICKET_CPT_SLUG,
        "normal",
        "default"
    );
}

// meta box: dane zgloszenia (readonly)
function askee_ticket_render_details_meta_box($post_object) {
    $ticket_number = (string) get_post_meta($post_object->ID, "_askee_ticket_number", true);
    $name = (string) get_post_meta($post_object->ID, "_askee_ticket_name", true);
    $email = (string) get_post_meta($post_object->ID, "_askee_ticket_email", true);
    $phone = (string) get_post_meta($post_object->ID, "_askee_ticket_phone", true);
    $company = (string) get_post_meta($post_object->ID, "_askee_ticket_company", true);
    $position = (string) get_post_meta($post_object->ID, "_askee_ticket_position", true);
    $category_slug = (string) get_post_meta($post_object->ID, "_askee_ticket_category", true);
    $previous_number = (string) get_post_meta($post_object->ID, "_askee_ticket_previous_number", true);
    $submission_ip = (string) get_post_meta($post_object->ID, "_askee_ticket_submission_ip", true);
    $user_agent = (string) get_post_meta($post_object->ID, "_askee_ticket_submission_user_agent", true);

    $categories_map = askee_ticket_get_categories_map();
    $category_label = $categories_map[$category_slug] ?? "—";

    $message_string = (string) $post_object->post_content;

    echo '<table class="askee-ticket-meta-table"><tbody>';
    echo "<tr><th>Numer:</th><td><strong>" . esc_html($ticket_number) . "</strong></td></tr>";
    echo "<tr><th>Imię i nazwisko:</th><td>" . esc_html($name) . "</td></tr>";
    echo "<tr><th>E-mail:</th><td>";
    if ($email !== "") {
        echo '<a href="mailto:' . esc_attr($email) . '">' . esc_html($email) . "</a>";
    } else {
        echo "—";
    }
    echo "</td></tr>";
    echo "<tr><th>Telefon:</th><td>" . ($phone !== "" ? esc_html($phone) : "—") . "</td></tr>";
    echo "<tr><th>Firma:</th><td>" . ($company !== "" ? esc_html($company) : "—") . "</td></tr>";
    echo "<tr><th>Stanowisko:</th><td>" . ($position !== "" ? esc_html($position) : "—") . "</td></tr>";
    echo "<tr><th>Kategoria:</th><td>" . esc_html($category_label) . "</td></tr>";
    echo "<tr><th>Nawiązuje do:</th><td>" . ($previous_number !== "" ? esc_html($previous_number) : "—") . "</td></tr>";
    echo '<tr><th>Adres IP nadawcy:</th><td><small style="color:#666;">(anti-spam, automatyczne)</small> ' .
        ($submission_ip !== "" ? esc_html($submission_ip) : "—") .
        "</td></tr>";
    echo "<tr><th>User-Agent:</th><td><code>" . ($user_agent !== "" ? esc_html($user_agent) : "—") . "</code></td></tr>";
    echo "</tbody></table>";

    echo "<h3 style=\"margin-top:18px;\">Treść zgłoszenia</h3>";
    echo '<div style="background:#f6f7f9;padding:12px;border-radius:6px;white-space:pre-wrap;">' .
        esc_html($message_string) .
        "</div>";
}

// meta box: historia ticketow tego usera (linki do innych)
function askee_ticket_render_history_meta_box($post_object) {
    $user_identifier_hash = (string) get_post_meta($post_object->ID, "_askee_ticket_user_identifier", true);

    if ($user_identifier_hash === "") {
        echo "<p>Brak identyfikatora użytkownika.</p>";
        return;
    }

    $query = new WP_Query([
        "post_type" => ASKEE_TICKET_CPT_SLUG,
        "post_status" => array_keys(askee_ticket_get_statuses_map()),
        "posts_per_page" => 50,
        "post__not_in" => [(int) $post_object->ID],
        "meta_query" => [
            [
                "key" => "_askee_ticket_user_identifier",
                "value" => $user_identifier_hash,
                "compare" => "=",
            ],
        ],
        "orderby" => "date",
        "order" => "DESC",
        "no_found_rows" => true,
    ]);

    if (!$query->have_posts()) {
        echo "<p>To pierwsze zgłoszenie tego użytkownika.</p>";
        return;
    }

    $statuses_map = askee_ticket_get_statuses_map();

    echo '<ul class="askee-ticket-history-list">';
    while ($query->have_posts()) {
        $query->the_post();
        $other_post_id = (int) get_the_ID();
        $other_ticket_number = (string) get_post_meta($other_post_id, "_askee_ticket_number", true);
        $other_status_slug = (string) get_post_status($other_post_id);
        $other_status_label = $statuses_map[$other_status_slug] ?? $other_status_slug;
        $edit_url_string = admin_url("post.php?post=" . $other_post_id . "&action=edit");
        $date_string = get_the_date("Y-m-d");

        echo "<li>";
        echo '<a href="' . esc_url($edit_url_string) . '"><strong>' . esc_html($other_ticket_number) . "</strong></a> ";
        echo '<span class="askee-ticket-status-badge askee-ticket-status-' . esc_attr($other_status_slug) . '">' .
            esc_html($other_status_label) . "</span><br>";
        echo '<small style="color:#666;">' . esc_html($date_string) . "</small>";
        echo "</li>";
    }
    echo "</ul>";

    wp_reset_postdata();
}

// meta box: zalaczniki (lista z linkami)
function askee_ticket_render_attachments_meta_box($post_object) {
    $attachments_array = get_attached_media("", $post_object->ID);

    if (empty($attachments_array)) {
        echo "<p>Brak załączników.</p>";
        return;
    }

    echo "<ul style=\"margin:0;padding:0;list-style:none;\">";
    foreach ($attachments_array as $attachment_post) {
        $attachment_url = wp_get_attachment_url($attachment_post->ID);
        $attachment_title = (string) $attachment_post->post_title;
        $filesize_bytes = (int) filesize(get_attached_file($attachment_post->ID));
        $filesize_human = function_exists("size_format") ? size_format($filesize_bytes) : (string) $filesize_bytes;

        echo '<li style="margin:6px 0;">';
        echo '<a href="' . esc_url($attachment_url) . '" target="_blank" rel="noopener">';
        echo esc_html($attachment_title);
        echo "</a>";
        echo ' <small style="color:#666;">(' . esc_html($filesize_human) . ")</small>";
        echo "</li>";
    }
    echo "</ul>";
}

// meta box: notatki wewnetrzne (textarea, zapisywane przez save_post)
function askee_ticket_render_internal_notes_meta_box($post_object) {
    $notes_value_string = (string) get_post_meta($post_object->ID, "_askee_ticket_internal_notes", true);
    wp_nonce_field("askee_ticket_internal_notes_nonce_action", "askee_ticket_internal_notes_nonce");
    echo '<textarea name="askee_ticket_internal_notes" rows="6" style="width:100%;font-family:inherit;font-size:13px;">' .
        esc_textarea($notes_value_string) .
        "</textarea>";
    echo '<p class="description">Notatki widoczne tylko dla zespołu. Nie są wysyłane do zgłaszającego.</p>';
}

// zapis notatek wewnetrznych
add_action("save_post_" . ASKEE_TICKET_CPT_SLUG, "askee_ticket_save_internal_notes", 11, 2);
function askee_ticket_save_internal_notes($post_id, $post_object) {
    if (defined("DOING_AUTOSAVE") && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;
    if (!current_user_can("edit_post", $post_id)) return;

    if (
        !isset($_POST["askee_ticket_internal_notes_nonce"]) ||
        !wp_verify_nonce(
            sanitize_text_field((string) $_POST["askee_ticket_internal_notes_nonce"]),
            "askee_ticket_internal_notes_nonce_action"
        )
    ) {
        return;
    }

    $notes_raw = isset($_POST["askee_ticket_internal_notes"]) ? (string) $_POST["askee_ticket_internal_notes"] : "";
    $notes_clean = sanitize_textarea_field($notes_raw);

    update_post_meta($post_id, "_askee_ticket_internal_notes", $notes_clean);
}

// =============================================================================
// 11. EKSPORT CSV
// =============================================================================

// submenu page pod CPT
add_action("admin_menu", "askee_ticket_register_csv_export_page");
function askee_ticket_register_csv_export_page() {
    add_submenu_page(
        "edit.php?post_type=" . ASKEE_TICKET_CPT_SLUG,
        "Eksport zgłoszeń (CSV)",
        "Eksport CSV",
        "edit_posts",
        "askee-ticket-csv-export",
        "askee_ticket_render_csv_export_page"
    );
}

// formularz eksportu — filtry: zakres dat, status, kategoria
function askee_ticket_render_csv_export_page() {
    if (!current_user_can("edit_posts")) {
        wp_die("Brak uprawnień.");
    }

    $statuses_map = askee_ticket_get_statuses_map();
    $categories_map = askee_ticket_get_categories_map();
    $action_url = admin_url("admin-post.php");

    echo '<div class="wrap">';
    echo "<h1>Eksport zgłoszeń do CSV</h1>";
    echo '<p>Wybierz filtry (opcjonalnie) i kliknij "Pobierz CSV".</p>';
    echo '<form method="post" action="' . esc_url($action_url) . '">';
    wp_nonce_field("askee_ticket_csv_export_action", "askee_ticket_csv_export_nonce");
    echo '<input type="hidden" name="action" value="askee_ticket_csv_export">';

    echo '<table class="form-table"><tbody>';

    echo '<tr><th><label for="askee_ticket_export_date_from">Data od:</label></th>';
    echo '<td><input type="date" id="askee_ticket_export_date_from" name="date_from"></td></tr>';

    echo '<tr><th><label for="askee_ticket_export_date_to">Data do:</label></th>';
    echo '<td><input type="date" id="askee_ticket_export_date_to" name="date_to"></td></tr>';

    echo '<tr><th><label for="askee_ticket_export_status">Status:</label></th>';
    echo '<td><select id="askee_ticket_export_status" name="status_filter">';
    echo '<option value="">Wszystkie</option>';
    foreach ($statuses_map as $status_slug => $status_label) {
        echo '<option value="' . esc_attr($status_slug) . '">' . esc_html($status_label) . "</option>";
    }
    echo "</select></td></tr>";

    echo '<tr><th><label for="askee_ticket_export_category">Kategoria:</label></th>';
    echo '<td><select id="askee_ticket_export_category" name="category_filter">';
    echo '<option value="">Wszystkie</option>';
    foreach ($categories_map as $cat_slug => $cat_label) {
        echo '<option value="' . esc_attr($cat_slug) . '">' . esc_html($cat_label) . "</option>";
    }
    echo "</select></td></tr>";

    echo "</tbody></table>";

    submit_button("Pobierz CSV");
    echo "</form>";
    echo "</div>";
}

// handler eksportu — generuje plik CSV i wysyla jako download
add_action("admin_post_askee_ticket_csv_export", "askee_ticket_handle_csv_export");
function askee_ticket_handle_csv_export() {
    if (!current_user_can("edit_posts")) {
        wp_die("Brak uprawnień.");
    }
    if (
        !isset($_POST["askee_ticket_csv_export_nonce"]) ||
        !wp_verify_nonce(
            sanitize_text_field((string) $_POST["askee_ticket_csv_export_nonce"]),
            "askee_ticket_csv_export_action"
        )
    ) {
        wp_die("Nieprawidłowy nonce.");
    }

    $date_from_string = isset($_POST["date_from"]) ? sanitize_text_field((string) $_POST["date_from"]) : "";
    $date_to_string = isset($_POST["date_to"]) ? sanitize_text_field((string) $_POST["date_to"]) : "";
    $status_filter_string = isset($_POST["status_filter"]) ? sanitize_text_field((string) $_POST["status_filter"]) : "";
    $category_filter_string = isset($_POST["category_filter"]) ? sanitize_text_field((string) $_POST["category_filter"]) : "";

    $statuses_map = askee_ticket_get_statuses_map();
    $categories_map = askee_ticket_get_categories_map();

    $query_args_array = [
        "post_type" => ASKEE_TICKET_CPT_SLUG,
        "post_status" => array_keys($statuses_map),
        "posts_per_page" => -1,
        "orderby" => "date",
        "order" => "DESC",
        "no_found_rows" => true,
    ];

    if ($status_filter_string !== "" && array_key_exists($status_filter_string, $statuses_map)) {
        $query_args_array["post_status"] = $status_filter_string;
    }

    if ($category_filter_string !== "" && array_key_exists($category_filter_string, $categories_map)) {
        $query_args_array["meta_query"] = [
            [
                "key" => "_askee_ticket_category",
                "value" => $category_filter_string,
                "compare" => "=",
            ],
        ];
    }

    if ($date_from_string !== "" || $date_to_string !== "") {
        $date_query_array = [];
        if ($date_from_string !== "") {
            $date_query_array["after"] = $date_from_string . " 00:00:00";
        }
        if ($date_to_string !== "") {
            $date_query_array["before"] = $date_to_string . " 23:59:59";
        }
        $date_query_array["inclusive"] = true;
        $query_args_array["date_query"] = [$date_query_array];
    }

    $tickets_query = new WP_Query($query_args_array);

    $filename_string = "askee-zgloszenia-" . wp_date("Y-m-d-His") . ".csv";

    // wyczyscic buffer zeby nic nie szlo przed CSV (admin-post.php nie powinno cokolwiek echo'ac, ale defensywnie)
    if (ob_get_level() > 0) {
        @ob_end_clean();
    }

    nocache_headers();
    header("Content-Type: text/csv; charset=UTF-8");
    header('Content-Disposition: attachment; filename="' . $filename_string . '"');

    $output_stream = fopen("php://output", "w");
    // BOM dla Excela (zeby UTF-8 sie prawidlowo otworzyl)
    fwrite($output_stream, "\xEF\xBB\xBF");

    fputcsv($output_stream, [
        "Numer",
        "Data zgłoszenia",
        "Status",
        "Kategoria",
        "Imię i nazwisko",
        "E-mail",
        "Telefon",
        "Firma",
        "Stanowisko",
        "Nawiązuje do",
        "Treść",
        "Notatki wewnętrzne",
        "Ostatnia aktualizacja",
    ]);

    while ($tickets_query->have_posts()) {
        $tickets_query->the_post();
        $post_id_value = (int) get_the_ID();

        $row_array = [
            (string) get_post_meta($post_id_value, "_askee_ticket_number", true),
            get_the_date("Y-m-d H:i:s"),
            $statuses_map[get_post_status($post_id_value)] ?? get_post_status($post_id_value),
            $categories_map[(string) get_post_meta($post_id_value, "_askee_ticket_category", true)]
                ?? (string) get_post_meta($post_id_value, "_askee_ticket_category", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_name", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_email", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_phone", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_company", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_position", true),
            (string) get_post_meta($post_id_value, "_askee_ticket_previous_number", true),
            (string) get_post_field("post_content", $post_id_value),
            (string) get_post_meta($post_id_value, "_askee_ticket_internal_notes", true),
            get_the_modified_date("Y-m-d H:i:s"),
        ];

        fputcsv($output_stream, $row_array);
    }

    fclose($output_stream);
    wp_reset_postdata();
    exit();
}

// =============================================================================
// 12. FRONTEND CONFIG (window.AskeeTicketConfig)
// =============================================================================

add_action("wp_enqueue_scripts", "askee_register_ticket_form_config", 23);
function askee_register_ticket_form_config() {
    if (!wp_script_is("askeetheme-main", "enqueued")) {
        return;
    }

    $config_array = [
        "restUrl" => esc_url_raw(rest_url("askee/v1/ticket")),
        "nonceRefreshUrl" => esc_url_raw(rest_url("askee/v1/ticket-nonce")),
        "nonce" => wp_create_nonce("wp_rest"),
        "honeypotFieldName" => ASKEE_TICKET_HONEYPOT_FIELD_NAME,
        "categoriesMap" => askee_ticket_get_categories_map(),
        "attachmentMaxCount" => (int) ASKEE_TICKET_ATTACHMENT_MAX_COUNT,
        "attachmentMaxBytesPerFile" => (int) ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE,
        "attachmentAllowedExtensions" => askee_ticket_get_allowed_extensions_array(),
        "ticketNumberRegex" => "^" . preg_quote(ASKEE_TICKET_NUMBER_PREFIX, "/") . "-\\d{4}-\\d{4,}$",
    ];

    wp_add_inline_script(
        "askeetheme-main",
        "window.AskeeTicketConfig = " . wp_json_encode($config_array) . ";",
        "before"
    );
}
