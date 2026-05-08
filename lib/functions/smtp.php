<?php

if (!defined("ABSPATH")) {
    exit();
}

/**
 * Konfiguracja SMTP dla Askee.
 *
 * WSZYSTKIE wartosci sa czytane wylacznie z wp-config.php (poza repo).
 * Brak hardcoded defaults — jesli stalych nie ma, SMTP hook NIE podpina sie
 * i wp_mail spadnie do domyslnego transportu PHPMailera (mail()/sendmail).
 *
 * Wymagany blok w wp-config.php:
 *
 *     define("ASKEE_SMTP_HOST", "web6.aftermarket.hosting");
 *     define("ASKEE_SMTP_PORT", 587);
 *     define("ASKEE_SMTP_USERNAME", "noreply@askee.pl");
 *     define("ASKEE_SMTP_PASSWORD", "...");
 *     define("ASKEE_SMTP_ENCRYPTION", "tls"); // tls | ssl | none
 *     define("ASKEE_SMTP_FROM_EMAIL", "noreply@askee.pl");
 *     define("ASKEE_SMTP_FROM_NAME", "Askee");
 *
 * Opcjonalne:
 *
 *     define("ASKEE_SMTP_DEBUG", true); // verbose log do error_log (tylko z WP_DEBUG)
 */

// sprawdza czy mamy minimum potrzebne do podpiecia SMTP. Brak jednej z tych
// stalych = nie konfigurujemy phpmailera, wpis w error_log dla operatora.
function askee_smtp_is_configured() {
    return defined("ASKEE_SMTP_HOST") &&
        defined("ASKEE_SMTP_PORT") &&
        defined("ASKEE_SMTP_USERNAME") &&
        defined("ASKEE_SMTP_PASSWORD");
}

// jednorazowy warning do logu jesli stalych brak
add_action("init", "askee_smtp_warn_when_unconfigured");
function askee_smtp_warn_when_unconfigured() {
    if (askee_smtp_is_configured()) {
        return;
    }

    if (!function_exists("error_log")) {
        return;
    }

    static $already_warned_boolean = false;
    if ($already_warned_boolean) {
        return;
    }
    $already_warned_boolean = true;

    error_log(
        "[Askee SMTP] missing required wp-config.php constants: ASKEE_SMTP_HOST, " .
            "ASKEE_SMTP_PORT, ASKEE_SMTP_USERNAME, ASKEE_SMTP_PASSWORD. " .
            "wp_mail will fall back to default PHP transport (mail/sendmail).",
    );
}

// konfiguruje PHPMailera zeby slal przez nasz SMTP zamiast lokalnego mail()
add_action("phpmailer_init", "askee_configure_phpmailer_smtp");
function askee_configure_phpmailer_smtp($phpmailer) {
    if (!is_object($phpmailer)) {
        return;
    }

    if (!askee_smtp_is_configured()) {
        return;
    }

    $phpmailer->isSMTP();
    $phpmailer->Host = (string) ASKEE_SMTP_HOST;
    $phpmailer->Port = (int) ASKEE_SMTP_PORT;
    $phpmailer->SMTPAuth = true;
    $phpmailer->Username = (string) ASKEE_SMTP_USERNAME;
    $phpmailer->Password = (string) ASKEE_SMTP_PASSWORD;

    $encryption_value_string = defined("ASKEE_SMTP_ENCRYPTION")
        ? strtolower((string) ASKEE_SMTP_ENCRYPTION)
        : "tls";

    if ($encryption_value_string === "ssl") {
        $phpmailer->SMTPSecure = "ssl";
    } elseif ($encryption_value_string === "" || $encryption_value_string === "none") {
        $phpmailer->SMTPSecure = "";
        $phpmailer->SMTPAutoTLS = false;
    } else {
        $phpmailer->SMTPSecure = "tls";
    }

    $phpmailer->CharSet = "UTF-8";
    $phpmailer->Encoding = "8bit";
    $phpmailer->Timeout = 15;

    // jesli nikt nie ustawil From, podstawiamy From z wp-config (jesli jest)
    $default_wordpress_from_string =
        "wordpress@" . wp_parse_url(home_url(), PHP_URL_HOST);
    $is_default_from_boolean =
        empty($phpmailer->From) || $phpmailer->From === $default_wordpress_from_string;

    if ($is_default_from_boolean && defined("ASKEE_SMTP_FROM_EMAIL")) {
        $phpmailer->From = (string) ASKEE_SMTP_FROM_EMAIL;
        $phpmailer->FromName = defined("ASKEE_SMTP_FROM_NAME")
            ? (string) ASKEE_SMTP_FROM_NAME
            : "Askee";
    }

    // wlaczamy verbose debug tylko jak WP_DEBUG aktywne
    if (defined("WP_DEBUG") && WP_DEBUG && defined("ASKEE_SMTP_DEBUG") && ASKEE_SMTP_DEBUG) {
        $phpmailer->SMTPDebug = 2;
        $phpmailer->Debugoutput = "error_log";
    }
}

// domyslny From - zeby wp_mail bez naglowkow szlo z naszego konfiguracji
add_filter("wp_mail_from", "askee_filter_default_wp_mail_from");
function askee_filter_default_wp_mail_from($from_email_string) {
    if (!defined("ASKEE_SMTP_FROM_EMAIL")) {
        return $from_email_string;
    }

    $default_wordpress_from_string =
        "wordpress@" . wp_parse_url(home_url(), PHP_URL_HOST);

    if (
        is_string($from_email_string) &&
        $from_email_string !== "" &&
        $from_email_string !== $default_wordpress_from_string
    ) {
        return $from_email_string;
    }

    return (string) ASKEE_SMTP_FROM_EMAIL;
}

add_filter("wp_mail_from_name", "askee_filter_default_wp_mail_from_name");
function askee_filter_default_wp_mail_from_name($from_name_string) {
    if (!defined("ASKEE_SMTP_FROM_NAME")) {
        return $from_name_string;
    }

    if (
        is_string($from_name_string) &&
        $from_name_string !== "" &&
        $from_name_string !== "WordPress"
    ) {
        return $from_name_string;
    }

    return (string) ASKEE_SMTP_FROM_NAME;
}

// admin-only smoke test SMTP: GET /wp-json/askee/v1/smtp-test (tylko dla zalogowanych adminow)
add_action("rest_api_init", function () {
    register_rest_route("askee/v1", "/smtp-test", [
        "methods" => "GET",
        "callback" => "askee_smtp_test_callback",
        "permission_callback" => function () {
            return current_user_can("manage_options");
        },
    ]);
});

function askee_smtp_test_callback() {
    if (!askee_smtp_is_configured()) {
        return new WP_REST_Response(
            [
                "ok" => false,
                "error" => "smtp_not_configured",
                "message" => "Brak stalych ASKEE_SMTP_* w wp-config.php.",
            ],
            500,
        );
    }

    $recipient_email_string = defined("ASKEE_SMTP_FROM_EMAIL")
        ? (string) ASKEE_SMTP_FROM_EMAIL
        : (string) ASKEE_SMTP_USERNAME;

    $sent_successfully_boolean = wp_mail(
        $recipient_email_string,
        "[Askee] SMTP smoke test",
        sprintf(
            "Test SMTP wykonany %s na %s.\nJesli widzisz tego maila, wp_mail+SMTP dziala.",
            wp_date("Y-m-d H:i:s"),
            home_url(),
        ),
        ["Content-Type: text/plain; charset=UTF-8"],
    );

    return new WP_REST_Response(
        [
            "ok" => (bool) $sent_successfully_boolean,
            "to" => $recipient_email_string,
            "host" => (string) ASKEE_SMTP_HOST,
            "port" => (int) ASKEE_SMTP_PORT,
            "encryption" => defined("ASKEE_SMTP_ENCRYPTION")
                ? (string) ASKEE_SMTP_ENCRYPTION
                : "tls",
        ],
        $sent_successfully_boolean ? 200 : 500,
    );
}

// admin page Tools -> Askee SMTP test - przycisk wysylajacy testowego maila
// uzywamy nonce z formularza, dziala bez wpisywania REST URL recznie
add_action("admin_menu", "askee_smtp_register_admin_test_page");
function askee_smtp_register_admin_test_page() {
    add_management_page(
        "Askee SMTP test",
        "Askee SMTP test",
        "manage_options",
        "askee-smtp-test",
        "askee_smtp_render_admin_test_page",
    );
}

function askee_smtp_render_admin_test_page() {
    if (!current_user_can("manage_options")) {
        wp_die(__("You do not have sufficient permissions to access this page."));
    }

    $result_message_string = "";
    $result_status_string = "";
    $result_details_array = [];

    // obsluga submitu testu
    if (
        isset($_POST["askee_smtp_run_test"]) &&
        check_admin_referer("askee_smtp_test_action", "askee_smtp_test_nonce")
    ) {
        if (!askee_smtp_is_configured()) {
            $result_status_string = "error";
            $result_message_string =
                "Brak wymaganych stałych ASKEE_SMTP_* w wp-config.php (HOST/PORT/USERNAME/PASSWORD).";
        } else {
            $recipient_email_input_string = isset($_POST["askee_smtp_test_recipient"])
                ? sanitize_email((string) wp_unslash($_POST["askee_smtp_test_recipient"]))
                : "";

            if ($recipient_email_input_string === "") {
                $recipient_email_input_string = defined("ASKEE_SMTP_FROM_EMAIL")
                    ? (string) ASKEE_SMTP_FROM_EMAIL
                    : (string) ASKEE_SMTP_USERNAME;
            }

            // przechwytujemy bledy zeby je pokazac na stronie
            $captured_errors_array = [];
            $error_listener = function ($wp_error_object) use (&$captured_errors_array) {
                if (is_object($wp_error_object) && method_exists($wp_error_object, "get_error_message")) {
                    $captured_errors_array[] = $wp_error_object->get_error_message();
                }
            };
            add_action("wp_mail_failed", $error_listener);

            // przechwytujemy pelny dialog SMTP zeby pokazac co dokladnie serwer mowi
            $smtp_dialog_lines_array = [];
            $debug_capture_listener = function ($phpmailer_obj) use (&$smtp_dialog_lines_array) {
                if (!is_object($phpmailer_obj)) {
                    return;
                }
                $phpmailer_obj->SMTPDebug = 3;
                $phpmailer_obj->Debugoutput = function ($message_string, $level) use (
                    &$smtp_dialog_lines_array,
                ) {
                    // maskujemy haslo w base64 zeby nie wyciekło na ekran admina
                    $sanitized_line = trim((string) $message_string);
                    if (defined("ASKEE_SMTP_PASSWORD")) {
                        $password_b64_string = base64_encode((string) ASKEE_SMTP_PASSWORD);
                        if ($password_b64_string !== "") {
                            $sanitized_line = str_replace(
                                $password_b64_string,
                                "[***password-base64-redacted***]",
                                $sanitized_line,
                            );
                        }
                    }
                    $smtp_dialog_lines_array[] = $sanitized_line;
                };
            };
            // priority 99 zeby uruchomilo sie PO naszym defaultowym phpmailer_init
            add_action("phpmailer_init", $debug_capture_listener, 99);

            $sent_successfully_boolean = wp_mail(
                $recipient_email_input_string,
                "[Askee] SMTP smoke test",
                sprintf(
                    "Test SMTP wykonany %s na %s.\nJesli widzisz tego maila, wp_mail+SMTP dziala.",
                    wp_date("Y-m-d H:i:s"),
                    home_url(),
                ),
                ["Content-Type: text/plain; charset=UTF-8"],
            );

            remove_action("phpmailer_init", $debug_capture_listener, 99);
            remove_action("wp_mail_failed", $error_listener);

            // wrzucamy dialog do details zeby pokazac obok bledow
            if (!empty($smtp_dialog_lines_array)) {
                $result_details_array["__smtp_dialog__"] = $smtp_dialog_lines_array;
            }

            if ($sent_successfully_boolean) {
                $result_status_string = "success";
                $result_message_string = sprintf(
                    "Mail testowy został wysłany do: %s",
                    $recipient_email_input_string,
                );
            } else {
                $result_status_string = "error";
                $result_message_string =
                    "Wysłanie testowego maila NIE powiodło się.";
                if (!empty($captured_errors_array)) {
                    $result_details_array = $captured_errors_array;
                }
            }
        }
    }

    $is_configured_boolean = askee_smtp_is_configured();
    $current_host_string = $is_configured_boolean ? (string) ASKEE_SMTP_HOST : "(brak)";
    $current_port_int = $is_configured_boolean ? (int) ASKEE_SMTP_PORT : 0;
    $current_username_string = $is_configured_boolean
        ? (string) ASKEE_SMTP_USERNAME
        : "(brak)";
    $current_encryption_string = defined("ASKEE_SMTP_ENCRYPTION")
        ? (string) ASKEE_SMTP_ENCRYPTION
        : "tls";
    $current_from_email_string = defined("ASKEE_SMTP_FROM_EMAIL")
        ? (string) ASKEE_SMTP_FROM_EMAIL
        : "(brak — fallback do wordpress@host)";
    $current_from_name_string = defined("ASKEE_SMTP_FROM_NAME")
        ? (string) ASKEE_SMTP_FROM_NAME
        : "(brak — fallback do WordPress)";

    $default_recipient_string = $is_configured_boolean
        ? (defined("ASKEE_SMTP_FROM_EMAIL")
            ? (string) ASKEE_SMTP_FROM_EMAIL
            : (string) ASKEE_SMTP_USERNAME)
        : "";
    ?>
    <div class="wrap">
        <h1>Askee — test SMTP</h1>

        <?php if ($result_message_string !== "") : ?>
            <div class="notice notice-<?php echo $result_status_string === "success"
                ? "success"
                : "error"; ?> is-dismissible">
                <p><strong><?php echo esc_html($result_message_string); ?></strong></p>
                <?php if (!empty($result_details_array)) : ?>
                    <ul style="margin:0 0 0 20px;list-style:disc;">
                        <?php foreach ($result_details_array as $detail_key => $detail_value) : ?>
                            <?php if ($detail_key === "__smtp_dialog__" && is_array($detail_value)) : ?>
                                <li>
                                    <strong>Pełny dialog SMTP:</strong>
                                    <pre style="background:#23282d;color:#dfe6f0;padding:12px;border-radius:6px;max-height:380px;overflow:auto;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all;"><?php echo esc_html(
                                        implode("\n", $detail_value),
                                    ); ?></pre>
                                </li>
                            <?php else : ?>
                                <li><code><?php echo esc_html(
                                    is_string($detail_value) ? $detail_value : wp_json_encode($detail_value),
                                ); ?></code></li>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <h2>Aktualna konfiguracja</h2>
        <table class="widefat striped" style="max-width:720px;">
            <tbody>
                <tr><th scope="row">Host</th><td><code><?php echo esc_html(
                    $current_host_string,
                ); ?></code></td></tr>
                <tr><th scope="row">Port</th><td><code><?php echo (int) $current_port_int; ?></code></td></tr>
                <tr><th scope="row">Username</th><td><code><?php echo esc_html(
                    $current_username_string,
                ); ?></code></td></tr>
                <tr><th scope="row">Encryption</th><td><code><?php echo esc_html(
                    $current_encryption_string,
                ); ?></code></td></tr>
                <tr><th scope="row">From email</th><td><code><?php echo esc_html(
                    $current_from_email_string,
                ); ?></code></td></tr>
                <tr><th scope="row">From name</th><td><code><?php echo esc_html(
                    $current_from_name_string,
                ); ?></code></td></tr>
                <tr><th scope="row">Configured</th><td><strong style="color:<?php echo $is_configured_boolean
                    ? "#0a7d28"
                    : "#a00"; ?>">
                    <?php echo $is_configured_boolean ? "TAK" : "NIE — uzupełnij wp-config.php"; ?>
                </strong></td></tr>
            </tbody>
        </table>

        <h2 style="margin-top:30px;">Wyślij testowego maila</h2>
        <form method="post" action="">
            <?php wp_nonce_field("askee_smtp_test_action", "askee_smtp_test_nonce"); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="askee_smtp_test_recipient">Adres odbiorcy</label>
                    </th>
                    <td>
                        <input
                            type="email"
                            id="askee_smtp_test_recipient"
                            name="askee_smtp_test_recipient"
                            class="regular-text"
                            placeholder="<?php echo esc_attr($default_recipient_string); ?>"
                            value="<?php echo esc_attr($default_recipient_string); ?>"
                        />
                        <p class="description">Mail leci tylko na ten adres (nie na listę kontaktową).</p>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <button
                    type="submit"
                    name="askee_smtp_run_test"
                    value="1"
                    class="button button-primary"
                    <?php disabled(!$is_configured_boolean); ?>
                >Wyślij test</button>
            </p>
        </form>

        <h2 style="margin-top:30px;">Uwagi</h2>
        <ul style="list-style:disc;margin-left:20px;">
            <li>Jeśli test się uda, ale maile z formularza kontaktowego nie docierają — sprawdź SPAM
                i rekord SPF na domenie <code>askee.pl</code> (musi autoryzować
                <code><?php echo esc_html($current_host_string); ?></code>).</li>
            <li>Logi SMTP (gdy <code>WP_DEBUG=true</code> i <code>ASKEE_SMTP_DEBUG=true</code>) lądują
                w <code>wp-content/debug.log</code> albo <code>error_log</code> serwera.</li>
        </ul>
    </div>
    <?php
}

// rzuca bledem do logu kiedy wp_mail zawiedzie - zeby latwo diagnozowac na produkcji
add_action("wp_mail_failed", "askee_log_wp_mail_failed");
function askee_log_wp_mail_failed($wp_error_object) {
    if (!is_object($wp_error_object) || !method_exists($wp_error_object, "get_error_message")) {
        return;
    }

    if (!function_exists("error_log")) {
        return;
    }

    error_log("[Askee SMTP] wp_mail failed: " . $wp_error_object->get_error_message());

    $error_data = $wp_error_object->get_error_data();
    if (!empty($error_data)) {
        error_log("[Askee SMTP] error data: " . wp_json_encode($error_data));
    }
}
