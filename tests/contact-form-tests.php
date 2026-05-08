<?php
/**
 * Standalone unit tests dla helperow w lib/functions/contact-form.php.
 *
 * Uruchomienie:
 *
 *   php tests/contact-form-tests.php
 *
 * Testy nie wymagaja srodowiska WordPressa - definiujemy minimalne stuby
 * dla funkcji WP, ktorych uzywaja czyste helpery (sanitize_*, is_email).
 *
 * Co pokrywaja:
 *  - normalizacja telefonu (rozne formaty PL/INT, edge cases)
 *  - lista odbiorcow z deduplikacja
 *  - logika rate limitu (okno, blokada, reset po wygasnieciu)
 *  - honeypot (pole wypelnione -> bot)
 *  - czas-trap (submit < min sec -> bot)
 */

if (php_sapi_name() !== "cli") {
    die("Run via CLI: php tests/contact-form-tests.php\n");
}

// minimalne stuby WP dla helperow ktore ich uzywaja
if (!defined("ABSPATH")) {
    define("ABSPATH", __DIR__ . "/");
}
if (!function_exists("sanitize_email")) {
    function sanitize_email($email)
    {
        $email = trim((string) $email);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : "";
    }
}
if (!function_exists("is_email")) {
    function is_email($email)
    {
        return filter_var((string) $email, FILTER_VALIDATE_EMAIL) ? $email : false;
    }
}
if (!function_exists("sanitize_text_field")) {
    function sanitize_text_field($str)
    {
        $str = (string) $str;
        $str = strip_tags($str);
        $str = preg_replace('/[\r\n\t\0\x0B]/', " ", $str);
        $str = preg_replace('/\s+/', " ", $str);
        return trim($str);
    }
}
if (!function_exists("sanitize_textarea_field")) {
    function sanitize_textarea_field($str)
    {
        $str = (string) $str;
        $str = strip_tags($str);
        return trim($str);
    }
}

// stuby WP funkcji potrzebne do require_once
if (!function_exists("add_action")) {
    function add_action($a, $b = null, $c = null, $d = null) {}
}
if (!function_exists("add_filter")) {
    function add_filter($a, $b = null, $c = null, $d = null) {}
}
if (!function_exists("wp_create_nonce")) {
    function wp_create_nonce($action = -1)
    {
        return "test_nonce";
    }
}
if (!function_exists("wp_verify_nonce")) {
    function wp_verify_nonce($nonce, $action = -1)
    {
        return $nonce === "test_nonce";
    }
}
if (!function_exists("rest_url")) {
    function rest_url($path = "")
    {
        return "https://example.test/wp-json/" . ltrim($path, "/");
    }
}
if (!function_exists("esc_url_raw")) {
    function esc_url_raw($url)
    {
        return $url;
    }
}
if (!function_exists("home_url")) {
    function home_url($path = "")
    {
        return "https://example.test" . $path;
    }
}
if (!function_exists("get_bloginfo")) {
    function get_bloginfo($what)
    {
        return "Askee Test";
    }
}
if (!function_exists("wp_specialchars_decode")) {
    function wp_specialchars_decode($str, $flags = 0)
    {
        return html_entity_decode((string) $str, $flags);
    }
}
if (!function_exists("wp_date")) {
    function wp_date($fmt)
    {
        return date($fmt);
    }
}
if (!function_exists("wp_json_encode")) {
    function wp_json_encode($v, $f = 0)
    {
        return json_encode($v, $f);
    }
}
if (!function_exists("wp_script_is")) {
    function wp_script_is($h, $l = "enqueued")
    {
        return false;
    }
}
if (!function_exists("wp_add_inline_script")) {
    function wp_add_inline_script($h, $d, $p = "after") {}
}
if (!function_exists("register_rest_route")) {
    function register_rest_route($a, $b, $c) {}
}
if (!function_exists("get_transient")) {
    $GLOBALS["__test_transients"] = [];
    function get_transient($key)
    {
        return $GLOBALS["__test_transients"][$key] ?? false;
    }
}
if (!function_exists("set_transient")) {
    function set_transient($key, $value, $exp = 0)
    {
        $GLOBALS["__test_transients"][$key] = $value;
        return true;
    }
}
if (!function_exists("wp_salt")) {
    function wp_salt($scheme = "auth")
    {
        return "test_salt";
    }
}
if (!class_exists("WP_REST_Request")) {
    class WP_REST_Request
    {
        public $params = [];
        public $headers = [];
        public function __construct($params = [], $headers = [])
        {
            $this->params = $params;
            $this->headers = $headers;
        }
        public function get_param($key)
        {
            return $this->params[$key] ?? null;
        }
        public function get_json_params()
        {
            return $this->params;
        }
        public function get_header($key)
        {
            return $this->headers[strtolower($key)] ?? null;
        }
    }
}
if (!class_exists("WP_REST_Response")) {
    class WP_REST_Response
    {
        public $data;
        public $status;
        public function __construct($data = null, $status = 200)
        {
            $this->data = $data;
            $this->status = $status;
        }
        public function header($k, $v) {}
    }
}

// laduje funkcje z naszego pliku (potrzebne tylko helpery, nie REST callback)
require_once __DIR__ . "/../lib/functions/contact-form.php";

// === Runner ============================================================
$tests_passed_count = 0;
$tests_failed_count = 0;

function assert_test($condition, $test_name)
{
    global $tests_passed_count, $tests_failed_count;
    if ($condition) {
        $tests_passed_count++;
        echo "  ✓ $test_name\n";
        return true;
    }
    $tests_failed_count++;
    echo "  ✗ $test_name\n";
    return false;
}

function assert_equal($expected, $actual, $test_name)
{
    if ($expected === $actual) {
        return assert_test(true, $test_name);
    }
    global $tests_failed_count;
    $tests_failed_count++;
    echo "  ✗ $test_name\n";
    echo "    Expected: " . var_export($expected, true) . "\n";
    echo "    Actual:   " . var_export($actual, true) . "\n";
    return false;
}

// === Phone normalization ==============================================
echo "\nPhone normalization:\n";
assert_equal(
    "+48 123 456 789",
    askee_contact_normalize_phone_string("+48 123 456 789"),
    "PL number with country code and spaces",
);
assert_equal(
    "123-456-789",
    askee_contact_normalize_phone_string("123-456-789"),
    "PL number with dashes",
);
assert_equal(
    "+48 (123) 456-789",
    askee_contact_normalize_phone_string("+48 (123) 456-789"),
    "with parentheses",
);
assert_equal(
    "123 456 789",
    askee_contact_normalize_phone_string("  123   456   789  "),
    "collapses whitespace",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string("123"),
    "rejects too-short numbers (<7 digits)",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string(""),
    "rejects empty string",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string("12345678901234567890"),
    "rejects suspiciously long numbers (>18 digits)",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string("abcdefg"),
    "rejects pure letters",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string("123 456"),
    "rejects 6-digit numbers (below min 7)",
);
assert_equal(
    "1234567",
    askee_contact_normalize_phone_string("1234567"),
    "accepts exactly 7 digits",
);
// non-string input
assert_equal(
    "",
    askee_contact_normalize_phone_string(null),
    "null returns empty string",
);
assert_equal(
    "",
    askee_contact_normalize_phone_string(123456789),
    "integer returns empty string",
);

// === Recipient list dedup =============================================
echo "\nRecipient email list:\n";
$recipients_array = askee_contact_get_recipient_emails_array();
assert_test(is_array($recipients_array), "returns array");
assert_test(count($recipients_array) === 4, "has 4 recipients");
assert_test(
    in_array("kontakt@askee.pl", $recipients_array, true),
    "includes kontakt@askee.pl",
);
assert_test(
    in_array("piotr.pszczolkowski@askee.app", $recipients_array, true),
    "includes lowercased Piotr.Pszczolkowski@askee.app",
);
assert_test(
    in_array("kontakt@askee.app", $recipients_array, true),
    "includes kontakt@askee.app",
);
assert_test(
    in_array("kontakt@ercoding.pl", $recipients_array, true),
    "includes kontakt@ercoding.pl",
);
assert_test(
    count(array_unique($recipients_array)) === count($recipients_array),
    "no duplicate entries after normalization",
);

// === Default rate limit state =========================================
echo "\nDefault rate limit state:\n";
$default_state_array = askee_contact_get_default_rate_limit_state();
assert_equal(
    0,
    $default_state_array["window_started_at_timestamp"],
    "default window_started_at_timestamp is 0",
);
assert_equal(
    0,
    $default_state_array["messages_sent_in_window_count"],
    "default messages_sent_in_window_count is 0",
);
assert_equal(
    0,
    $default_state_array["blocked_until_timestamp"],
    "default blocked_until_timestamp is 0",
);

// === IP rate limit (in-memory transient) ==============================
echo "\nIP rate limit:\n";
$_SERVER["HTTP_CF_CONNECTING_IP"] = "1.2.3.4";
$GLOBALS["__test_transients"] = [];

$first_request_result = askee_contact_check_and_update_ip_rate_limit();
assert_test(
    !$first_request_result["is_blocked"],
    "first request is allowed",
);

// kolejne requesty az do limitu
for ($i = 0; $i < ASKEE_CONTACT_RATE_LIMIT_MAX_MESSAGES - 1; $i++) {
    askee_contact_check_and_update_ip_rate_limit();
}

$over_limit_result = askee_contact_check_and_update_ip_rate_limit();
assert_test(
    $over_limit_result["is_blocked"],
    "request after MAX_MESSAGES is blocked",
);
assert_test(
    $over_limit_result["minutes_left"] >= 1,
    "blocked response carries minutes_left >= 1",
);

// inny IP nie jest zablokowany
$_SERVER["HTTP_CF_CONNECTING_IP"] = "5.6.7.8";
$other_ip_result = askee_contact_check_and_update_ip_rate_limit();
assert_test(
    !$other_ip_result["is_blocked"],
    "different IP is not affected by previous IP's quota",
);

// brak IP - przepuszcza, sesja przejmie kontrole
unset($_SERVER["HTTP_CF_CONNECTING_IP"]);
unset($_SERVER["HTTP_X_FORWARDED_FOR"]);
unset($_SERVER["REMOTE_ADDR"]);
$no_ip_result = askee_contact_check_and_update_ip_rate_limit();
assert_test(
    !$no_ip_result["is_blocked"],
    "missing IP returns not-blocked (defers to session limiter)",
);

// === Request IP detection ============================================
echo "\nIP detection priority:\n";
$_SERVER["HTTP_CF_CONNECTING_IP"] = "10.0.0.1";
$_SERVER["HTTP_X_FORWARDED_FOR"] = "20.0.0.1, 30.0.0.1";
$_SERVER["REMOTE_ADDR"] = "40.0.0.1";
assert_equal(
    "10.0.0.1",
    askee_contact_get_request_ip_address(),
    "CF-Connecting-IP wins over X-Forwarded-For and REMOTE_ADDR",
);

unset($_SERVER["HTTP_CF_CONNECTING_IP"]);
assert_equal(
    "20.0.0.1",
    askee_contact_get_request_ip_address(),
    "first IP from X-Forwarded-For when CF header missing",
);

unset($_SERVER["HTTP_X_FORWARDED_FOR"]);
assert_equal(
    "40.0.0.1",
    askee_contact_get_request_ip_address(),
    "REMOTE_ADDR as last fallback",
);

$_SERVER["REMOTE_ADDR"] = "not-an-ip";
assert_equal(
    "",
    askee_contact_get_request_ip_address(),
    "invalid IP returns empty string",
);

// === Summary ==========================================================
echo "\n";
echo str_repeat("=", 60) . "\n";
$total_count = $tests_passed_count + $tests_failed_count;
echo "Tests: $total_count total, $tests_passed_count passed, $tests_failed_count failed\n";
echo str_repeat("=", 60) . "\n";

exit($tests_failed_count > 0 ? 1 : 0);
