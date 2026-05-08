<?php

if (!defined("ABSPATH")) {
    exit();
}

/**
 * Konfiguracja SMTP dla Askee.
 *
 * Wartości można nadpisać z poziomu wp-config.php — zalecane na produkcji,
 * żeby hasło SMTP nie żyło w repozytorium. Hardcoded defaults są tu po to,
 * żeby motyw zadziałał od razu po deployu bez dodatkowej konfiguracji.
 *
 * Zalecany blok dla wp-config.php (poza repo):
 *
 *     define("ASKEE_SMTP_HOST", "web6.aftermarket.hosting");
 *     define("ASKEE_SMTP_PORT", 587);
 *     define("ASKEE_SMTP_USERNAME", "noreply@askee.pl");
 *     define("ASKEE_SMTP_PASSWORD", "...");
 *     define("ASKEE_SMTP_ENCRYPTION", "tls"); // tls | ssl
 *     define("ASKEE_SMTP_FROM_EMAIL", "noreply@askee.pl");
 *     define("ASKEE_SMTP_FROM_NAME", "Askee");
 */

if (!defined("ASKEE_SMTP_HOST")) {
    define("ASKEE_SMTP_HOST", "web6.aftermarket.hosting");
}
if (!defined("ASKEE_SMTP_PORT")) {
    define("ASKEE_SMTP_PORT", 587);
}
if (!defined("ASKEE_SMTP_USERNAME")) {
    define("ASKEE_SMTP_USERNAME", "noreply@askee.pl");
}
if (!defined("ASKEE_SMTP_PASSWORD")) {
    define("ASKEE_SMTP_PASSWORD", "Askeenoreply");
}
if (!defined("ASKEE_SMTP_ENCRYPTION")) {
    define("ASKEE_SMTP_ENCRYPTION", "tls");
}
if (!defined("ASKEE_SMTP_FROM_EMAIL")) {
    define("ASKEE_SMTP_FROM_EMAIL", "noreply@askee.pl");
}
if (!defined("ASKEE_SMTP_FROM_NAME")) {
    define("ASKEE_SMTP_FROM_NAME", "Askee");
}

// konfiguruje PHPMailera zeby slal przez nasz SMTP zamiast lokalnego mail()
add_action("phpmailer_init", "askee_configure_phpmailer_smtp");
function askee_configure_phpmailer_smtp($phpmailer) {
    if (!is_object($phpmailer)) {
        return;
    }

    $phpmailer->isSMTP();
    $phpmailer->Host = (string) ASKEE_SMTP_HOST;
    $phpmailer->Port = (int) ASKEE_SMTP_PORT;
    $phpmailer->SMTPAuth = true;
    $phpmailer->Username = (string) ASKEE_SMTP_USERNAME;
    $phpmailer->Password = (string) ASKEE_SMTP_PASSWORD;

    $encryption_lowercase_string = strtolower((string) ASKEE_SMTP_ENCRYPTION);
    if ($encryption_lowercase_string === "ssl") {
        $phpmailer->SMTPSecure = "ssl";
    } elseif ($encryption_lowercase_string === "" || $encryption_lowercase_string === "none") {
        $phpmailer->SMTPSecure = "";
        $phpmailer->SMTPAutoTLS = false;
    } else {
        $phpmailer->SMTPSecure = "tls";
    }

    $phpmailer->CharSet = "UTF-8";
    $phpmailer->Encoding = "8bit";
    $phpmailer->Timeout = 15;

    // jesli nikt nie ustawil From, podstawiamy nasz noreply
    $default_wordpress_from_string =
        "wordpress@" . wp_parse_url(home_url(), PHP_URL_HOST);
    if (empty($phpmailer->From) || $phpmailer->From === $default_wordpress_from_string) {
        $phpmailer->From = (string) ASKEE_SMTP_FROM_EMAIL;
        $phpmailer->FromName = (string) ASKEE_SMTP_FROM_NAME;
    }

    // wlaczamy verbose debug tylko jak WP_DEBUG aktywne
    if (defined("WP_DEBUG") && WP_DEBUG && defined("ASKEE_SMTP_DEBUG") && ASKEE_SMTP_DEBUG) {
        $phpmailer->SMTPDebug = 2;
        $phpmailer->Debugoutput = "error_log";
    }
}

// domyslny From - zeby wp_mail bez naglowkow szlo z noreply@askee.pl, nie z wordpress@host
add_filter("wp_mail_from", "askee_filter_default_wp_mail_from");
function askee_filter_default_wp_mail_from($from_email_string) {
    $default_wordpress_from_string =
        "wordpress@" . wp_parse_url(home_url(), PHP_URL_HOST);

    if (
        is_string($from_email_string) &&
        $from_email_string !== "" &&
        $from_email_string !== $default_wordpress_from_string
    ) {
        // ktos juz ustawil custom From, zostawiamy
        return $from_email_string;
    }

    return (string) ASKEE_SMTP_FROM_EMAIL;
}

add_filter("wp_mail_from_name", "askee_filter_default_wp_mail_from_name");
function askee_filter_default_wp_mail_from_name($from_name_string) {
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
    $recipient_email_string = (string) ASKEE_SMTP_FROM_EMAIL;
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
            "encryption" => (string) ASKEE_SMTP_ENCRYPTION,
        ],
        $sent_successfully_boolean ? 200 : 500,
    );
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
