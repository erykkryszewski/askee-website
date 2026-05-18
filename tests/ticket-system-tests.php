<?php

if (php_sapi_name() !== "cli") {
    die("Run via CLI: php tests/ticket-system-tests.php\n");
}

if (!defined("ABSPATH")) {
    define("ABSPATH", __DIR__ . "/");
}

if (!function_exists("sanitize_email")) {
    function sanitize_email($email) {
        $email = trim((string) $email);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : "";
    }
}
if (!function_exists("is_email")) {
    function is_email($email) {
        return filter_var((string) $email, FILTER_VALIDATE_EMAIL) ? $email : false;
    }
}
if (!function_exists("sanitize_text_field")) {
    function sanitize_text_field($str) {
        $str = (string) $str;
        $str = strip_tags($str);
        $str = preg_replace('/[\r\n\t\0\x0B]/', " ", $str);
        $str = preg_replace('/\s+/', " ", $str);
        return trim($str);
    }
}
if (!function_exists("sanitize_textarea_field")) {
    function sanitize_textarea_field($str) {
        $str = (string) $str;
        $str = strip_tags($str);
        return trim($str);
    }
}

if (!function_exists("add_action")) {
    function add_action($a, $b = null, $c = null, $d = null) {}
}
if (!function_exists("add_filter")) {
    function add_filter($a, $b = null, $c = null, $d = null) {}
}
if (!function_exists("wp_create_nonce")) {
    function wp_create_nonce($action = -1) {
        return "test_nonce";
    }
}
if (!function_exists("wp_verify_nonce")) {
    function wp_verify_nonce($nonce, $action = -1) {
        return $nonce === "test_nonce";
    }
}
if (!function_exists("rest_url")) {
    function rest_url($path = "") {
        return "https://example.test/wp-json/" . ltrim($path, "/");
    }
}
if (!function_exists("esc_url_raw")) {
    function esc_url_raw($url) {
        return $url;
    }
}
if (!function_exists("home_url")) {
    function home_url($path = "") {
        return "https://example.test" . $path;
    }
}
if (!function_exists("get_bloginfo")) {
    function get_bloginfo($what) {
        return "Askee Test";
    }
}
if (!function_exists("wp_specialchars_decode")) {
    function wp_specialchars_decode($s, $q = 0) {
        return $s;
    }
}
if (!function_exists("wp_parse_url")) {
    function wp_parse_url($url, $component = -1) {
        return parse_url($url, $component);
    }
}
if (!function_exists("wp_salt")) {
    function wp_salt($scheme = "auth") {
        return "test_salt_" . $scheme;
    }
}

$GLOBALS["test_options_storage"] = [];
if (!function_exists("get_option")) {
    function get_option($key, $default = false) {
        return $GLOBALS["test_options_storage"][$key] ?? $default;
    }
}
if (!function_exists("update_option")) {
    function update_option($key, $value, $autoload = null) {
        $GLOBALS["test_options_storage"][$key] = $value;
        return true;
    }
}
if (!function_exists("wp_date")) {
    function wp_date($format, $timestamp = null) {
        return date($format, $timestamp ?? time());
    }
}
if (!function_exists("time")) {

}
if (!function_exists("wp_json_encode")) {
    function wp_json_encode($data) {
        return json_encode($data);
    }
}
if (!function_exists("get_transient")) {
    function get_transient($key) {
        return $GLOBALS["test_transients_storage"][$key] ?? false;
    }
}
if (!function_exists("set_transient")) {
    function set_transient($key, $value, $expiration = 0) {
        $GLOBALS["test_transients_storage"][$key] = $value;
        return true;
    }
}
$GLOBALS["test_transients_storage"] = [];

if (!class_exists("WP_REST_Request")) {
    class WP_REST_Request {
        private $params = [];
        private $headers = [];
        private $json_params = [];

        public function set_param($key, $value) {
            $this->params[$key] = $value;
        }
        public function get_param($key) {
            return $this->params[$key] ?? null;
        }
        public function set_header($key, $value) {
            $this->headers[strtolower($key)] = $value;
        }
        public function get_header($key) {
            return $this->headers[strtolower($key)] ?? null;
        }
        public function set_json_params($params) {
            $this->json_params = $params;
        }
        public function get_json_params() {
            return $this->json_params;
        }
    }
}
if (!class_exists("WP_REST_Response")) {
    class WP_REST_Response {
        public $data;
        public $status;
        public $headers = [];

        public function __construct($data = null, $status = 200) {
            $this->data = $data;
            $this->status = $status;
        }
        public function header($key, $value) {
            $this->headers[$key] = $value;
        }
    }
}

require_once __DIR__ . "/../lib/functions/ticket-system.php";

$tests_passed_count = 0;
$tests_failed_count = 0;
$failures_log = [];

function assert_test($description, $is_true_boolean) {
    global $tests_passed_count, $tests_failed_count, $failures_log;
    if ($is_true_boolean) {
        $tests_passed_count += 1;
        echo "  PASS: " . $description . "\n";
    } else {
        $tests_failed_count += 1;
        $failures_log[] = $description;
        echo "  FAIL: " . $description . "\n";
    }
}

function assert_equal($description, $expected, $actual) {
    $is_equal = $expected === $actual;
    if (!$is_equal) {
        echo "    expected: " . var_export($expected, true) . "\n";
        echo "    actual:   " . var_export($actual, true) . "\n";
    }
    assert_test($description, $is_equal);
}

echo "\n=== askee_ticket_normalize_phone_string ===\n";

assert_equal("pusty string zwraca pusty", "", askee_ticket_normalize_phone_string(""));
assert_equal("null zwraca pusty", "", askee_ticket_normalize_phone_string(null));
assert_equal("9-cyfrowy PL OK", "500 025 365", askee_ticket_normalize_phone_string("500 025 365"));
assert_equal("z plusem i myslnikami OK", "+48 500-025-365", askee_ticket_normalize_phone_string("+48 500-025-365"));
assert_equal("za krotki zwraca pusty (3 cyfry)", "", askee_ticket_normalize_phone_string("123"));
assert_equal("za dlugi zwraca pusty (20 cyfr)", "", askee_ticket_normalize_phone_string("12345678901234567890"));
assert_equal("odrzuca litery", "500025365", askee_ticket_normalize_phone_string("500abc025xyz365"));

echo "\n=== askee_ticket_build_user_identifier_hash ===\n";

$hash_a = askee_ticket_build_user_identifier_hash("Jan@Example.com", "Jan Kowalski");
$hash_b = askee_ticket_build_user_identifier_hash("jan@example.com", "jan kowalski");
$hash_c = askee_ticket_build_user_identifier_hash("  jan@example.com  ", "  Jan   Kowalski  ");
$hash_d = askee_ticket_build_user_identifier_hash("inny@example.com", "Jan Kowalski");

assert_test("ten sam user dla roznej kapitalizacji email", $hash_a === $hash_b);
assert_test("ten sam user dla rozspacjowanego imienia", $hash_a === $hash_c);
assert_test("rozne usery dla roznych emaili", $hash_a !== $hash_d);
assert_test("hash to sha256 (64 hex chars)", strlen($hash_a) === 64 && ctype_xdigit($hash_a));

echo "\n=== askee_ticket_get_number_regex_pattern ===\n";

$regex_pattern = askee_ticket_get_number_regex_pattern();

assert_test("ASK-2026-0001 matchuje", (bool) preg_match($regex_pattern, "ASK-2026-0001"));
assert_test("ASK-2026-99999 matchuje (5-cyfrowy counter)", (bool) preg_match($regex_pattern, "ASK-2026-99999"));
assert_test("ASK-2026-001 NIE matchuje (3 cyfry)", !preg_match($regex_pattern, "ASK-2026-001"));
assert_test("ask-2026-0001 matchuje (case insensitive)", (bool) preg_match($regex_pattern, "ask-2026-0001"));
assert_test("XYZ-2026-0001 NIE matchuje (zly prefix)", !preg_match($regex_pattern, "XYZ-2026-0001"));
assert_test("ASK-26-0001 NIE matchuje (2-cyfrowy rok)", !preg_match($regex_pattern, "ASK-26-0001"));
assert_test("ASK_2026_0001 NIE matchuje (zle separatory)", !preg_match($regex_pattern, "ASK_2026_0001"));
assert_test("pusty NIE matchuje", !preg_match($regex_pattern, ""));

echo "\n=== askee_ticket_generate_next_number ===\n";

$GLOBALS["test_options_storage"] = [];

$first_number_string = askee_ticket_generate_next_number();
$current_year_string = date("Y");

$expected_first = "ASK-" . $current_year_string . "-0001";
assert_equal("pierwszy numer to ASK-{YYYY}-0001", $expected_first, $first_number_string);

$second_number_string = askee_ticket_generate_next_number();
$expected_second = "ASK-" . $current_year_string . "-0002";
assert_equal("drugi numer to ASK-{YYYY}-0002", $expected_second, $second_number_string);

for ($index = 3; $index <= 12; $index += 1) {
    askee_ticket_generate_next_number();
}
$thirteenth_number_string = askee_ticket_generate_next_number();
$expected_thirteenth = "ASK-" . $current_year_string . "-0013";
assert_equal("13-ty numer to ASK-{YYYY}-0013", $expected_thirteenth, $thirteenth_number_string);

echo "\n=== askee_ticket_get_allowed_extensions_array ===\n";

$allowed_extensions_array = askee_ticket_get_allowed_extensions_array();

assert_test("jpg jest dozwolony", in_array("jpg", $allowed_extensions_array, true));
assert_test("pdf jest dozwolony", in_array("pdf", $allowed_extensions_array, true));
assert_test("docx jest dozwolony", in_array("docx", $allowed_extensions_array, true));
assert_test("exe NIE jest dozwolony", !in_array("exe", $allowed_extensions_array, true));
assert_test("php NIE jest dozwolony", !in_array("php", $allowed_extensions_array, true));
assert_test("js NIE jest dozwolony", !in_array("js", $allowed_extensions_array, true));

$all_lowercase_boolean = true;
foreach ($allowed_extensions_array as $extension_string) {
    if ($extension_string !== strtolower($extension_string)) {
        $all_lowercase_boolean = false;
        break;
    }
}
assert_test("wszystkie rozszerzenia sa lowercase", $all_lowercase_boolean);

echo "\n=== askee_ticket_get_categories_map ===\n";

$categories_map = askee_ticket_get_categories_map();
assert_test("kategoria 'bug_critical' istnieje", array_key_exists("bug_critical", $categories_map));
assert_test("kategoria 'bug_normal' istnieje", array_key_exists("bug_normal", $categories_map));
assert_test("kategoria 'question' istnieje", array_key_exists("question", $categories_map));
assert_test("kategoria 'suggestion' istnieje", array_key_exists("suggestion", $categories_map));
assert_test("kategoria 'xxx_nieistniejaca' NIE istnieje", !array_key_exists("xxx_nieistniejaca", $categories_map));

echo "\n=== askee_ticket_get_statuses_map ===\n";

$statuses_map = askee_ticket_get_statuses_map();
assert_test("status 'ask_open' istnieje", array_key_exists("ask_open", $statuses_map));
assert_test("status 'ask_progress' istnieje", array_key_exists("ask_progress", $statuses_map));
assert_test("status 'ask_waiting' istnieje", array_key_exists("ask_waiting", $statuses_map));
assert_test("status 'ask_resolved' istnieje", array_key_exists("ask_resolved", $statuses_map));
assert_test("status 'ask_closed' istnieje", array_key_exists("ask_closed", $statuses_map));

$all_statuses_within_limit_boolean = true;
foreach (array_keys($statuses_map) as $status_slug_string) {
    if (strlen($status_slug_string) > 20) {
        $all_statuses_within_limit_boolean = false;
        echo "    too long: " . $status_slug_string . " (" . strlen($status_slug_string) . " chars)\n";
    }
}
assert_test("wszystkie slugi statusow <= 20 znakow", $all_statuses_within_limit_boolean);

assert_equal(
    "domyslny status to ask_open",
    "ask_open",
    askee_ticket_get_default_status_slug()
);

echo "\n=== askee_ticket_check_and_update_ip_rate_limit ===\n";

$GLOBALS["test_transients_storage"] = [];
$_SERVER["REMOTE_ADDR"] = "192.168.1.100";

$any_blocked_in_loop_boolean = false;

for ($index = 1; $index <= 5; $index += 1) {
    $rate_limit_result_array = askee_ticket_check_and_update_ip_rate_limit();
    if (!empty($rate_limit_result_array["is_blocked"])) {
        $any_blocked_in_loop_boolean = true;
        break;
    }
}
assert_test("pierwsze 5 zgloszen w oknie przechodzi", !$any_blocked_in_loop_boolean);

$sixth_attempt_result_array = askee_ticket_check_and_update_ip_rate_limit();
assert_test("6-te zgloszenie z tego samego IP jest zablokowane", !empty($sixth_attempt_result_array["is_blocked"]));
assert_test("minutes_left > 0 przy blokadzie", (int) ($sixth_attempt_result_array["minutes_left"] ?? 0) > 0);

$GLOBALS["test_transients_storage"] = [];
$_SERVER["REMOTE_ADDR"] = "10.0.0.1";
$other_ip_result_array = askee_ticket_check_and_update_ip_rate_limit();
assert_test("inny IP ma osobny licznik (1-sze zgloszenie nie blokuje)", empty($other_ip_result_array["is_blocked"]));

echo "\n========================================\n";
echo "Wyniki:\n";
echo "  Passed: " . $tests_passed_count . "\n";
echo "  Failed: " . $tests_failed_count . "\n";

if ($tests_failed_count > 0) {
    echo "\nFailed tests:\n";
    foreach ($failures_log as $failure_description) {
        echo "  - " . $failure_description . "\n";
    }
    exit(1);
}

echo "\nWszystkie testy zielone.\n";
exit(0);
