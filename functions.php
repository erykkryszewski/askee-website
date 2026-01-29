<?php

if (!defined("PAGE_THEME_DIR")) {
    define("PAGE_THEME_DIR", get_theme_root() . "/" . get_template() . "/");
}

if (!defined("PAGE_THEME_URL")) {
    define("PAGE_THEME_URL", WP_CONTENT_URL . "/themes/" . get_template() . "/");
}

require_once PAGE_THEME_DIR . "lib/classes/svg-support.php";
require_once PAGE_THEME_DIR . "lib/functions/search.php";
require_once PAGE_THEME_DIR . "lib/functions/image-object-fit.php";
require_once PAGE_THEME_DIR . "lib/functions/image-optimization.php";
// require_once(PAGE_THEME_DIR . 'lib/functions/required-plugins.php');

// Enable SVG support in WordPress
add_filter("upload_mimes", "askee_svg_support");
/**
 * Adds SVG upload support
 *
 * @since 1.0.0
 *
 * @param array $mimes Mime types.
 * @return array
 */
function askee_svg_support($mimes) {
    $mimes["svg"] = "image/svg+xml";
    return $mimes;
}

// Enable SVG in admin.
askee_SVG_Support::enable();

// Add theme supports
add_theme_support("editor-styles");
add_theme_support("woocommerce");
add_theme_support("title-tag");
add_theme_support("post-thumbnails");
add_theme_support("align-wide");
add_theme_support("wc-product-gallery-lightbox");
add_theme_support("wc-product-gallery-slider");
add_theme_support("html5", ["search-form", "comment-form", "comment-list", "gallery", "caption"]);

// Register Navigations
register_nav_menu("Navigation", __("Main navigation"));
register_nav_menu("Subpagenav", __("Subpage navigation"));

// Add custom theme image sizes
add_image_size("numbers-icon", 64, 64, ["center", "center"]);
add_image_size("testimonials", 90, 90, ["center", "center"]);
add_image_size("hero", 1280, 550, ["center", "center"]);
add_image_size("text-images-left", 375, 470, ["center", "center"]);
add_image_size("text-images-right", 313, 500, ["center", "center"]);
add_image_size("text-images-top", 313, 180, ["center", "center"]);

//ACF Config
require_once PAGE_THEME_DIR . "acf/config.php";

// Remove each style one by one
add_filter("woocommerce_enqueue_styles", function ($remove_styles) {
    unset($remove_styles["woocommerce-general"]);
    unset($remove_styles["woocommerce-layout"]);
    return $remove_styles;
});

add_action("wp_enqueue_scripts", function () {
    // wp_dequeue_style('search-filter-plugin-styles');
    // wp_deregister_style('search-filter-plugin-styles');

    wp_dequeue_style("wc-blocks-style");
    wp_dequeue_style("wp-block-library");
    wp_dequeue_style("wp-block-library-theme");

    wp_enqueue_script(
        "askeetheme-main",
        get_stylesheet_directory_uri() . "/js/dist/main.js",
        ["jquery"],
        filemtime(get_stylesheet_directory() . "/js/dist/main.js"),
        true,
    );
    wp_enqueue_style(
        "style",
        get_stylesheet_uri(),
        [],
        filemtime(get_stylesheet_directory() . "/style.css"),
    );
});

add_action("enqueue_block_editor_assets", function () {
    wp_enqueue_script(
        "askeetheme-admin",
        get_stylesheet_directory_uri() . "/js/dist/editor.js",
        ["wp-data"],
        filemtime(get_stylesheet_directory() . "/js/dist/editor.js"),
        true,
    );
});

add_action("admin_enqueue_scripts", function () {
    if (is_admin()) {
        wp_enqueue_style(
            "askeetheme-admin",
            get_stylesheet_directory_uri() . "/style-editor.css",
            [],
            filemtime(get_stylesheet_directory() . "/style-editor.css"),
        );
    }
});

/**
 * Deregister gravity forms recaptcha scripts.
 */
add_action("wp_footer", function () {
    wp_dequeue_script("gform_recaptcha");
    wp_deregister_script("gform_recaptcha");
});

/* deregister unused styles for non logged in users */

add_action("wp_print_styles", "askee_remove_unused_styles_for_non_logged_in_users", 100);

function askee_remove_unused_styles_for_non_logged_in_users() {
    if (!is_admin_bar_showing() && !is_customize_preview()) {
        // dashicons
        wp_dequeue_style("dashicons");
        wp_deregister_style("dashicons");
        // wp_deregister_style('gform_basic');
        // wp_deregister_style('gform_theme_components');
        // wp_deregister_style('gform_theme_ie11');
        // wp_deregister_style('gform_theme');
        wp_deregister_style("woocommerce-smallscreen");
    }
}

//Security stuff, disable some legacy functionality from WP that can cause DDoS attacks
add_filter("wp_headers", function ($headers) {
    unset($headers["X-Pingback"]);
    return $headers;
});

add_filter("xmlrpc_enabled", "__return_false");

// add sidebar
add_action("widgets_init", function () {
    register_sidebar([
        "id" => "askeetheme-sidebar",
        "name" => __("askeetheme Sidebar"),
        "description" => __("This is a blog sidebar."),
        "before_widget" => '<div class="sidebar__item">',
        "after_widget" => "</div>",
        "before_title" => "<h3>",
        "after_title" => "</h3>",
    ]);
});

/**
 * Check if WooCommerce is activated
 */
if (!function_exists("is_woocommerce_activated")) {
    function is_woocommerce_activated() {
        if (class_exists("woocommerce")) {
            return true;
        } else {
            return false;
        }
    }
}

// add alts to images
function auto_generate_image_title($html, $attachment_id, $size, $icon, $attr) {
    // Get the attachment post object
    $attachment = get_post($attachment_id);

    // Check if attachment exists before proceeding
    if ($attachment) {
        // Extract the file name without extension
        $filename = pathinfo($attachment->guid, PATHINFO_FILENAME);

        // Add the title attribute to the image
        $html = str_replace("<img", '<img title="' . $filename . '"', $html);
    }

    return $html;
}
add_filter("wp_get_attachment_image", "auto_generate_image_title", 10, 5);

// change gform error message

add_filter("gform_validation_message", "custom_validation_message", 10, 2);
function custom_validation_message($message, $form) {
    return '<p class="gform_error-message">Wypełnij poprawnie pola zaznaczone na czerwono oraz zaakceptuj politykę prywatności i regulamin</p>';
}

// disallow blocks page for other environments than local

function restrict_blocks_page_access() {
    $current_domain = $_SERVER["HTTP_HOST"];
    $current_url = $_SERVER["REQUEST_URI"];

    // if the URL contains 'blocks' and the domain does NOT contain 'askee' or 'local'
    if (
        strpos($current_url, "blocks") !== false &&
        strpos($current_domain, "askee") === false &&
        strpos($current_domain, "local") === false
    ) {
        wp_redirect(home_url());
        exit();
    }
}
add_action("template_redirect", "restrict_blocks_page_access");

// disable all admin notices
add_action("admin_head", function () {
    remove_all_actions("admin_notices");
    remove_all_actions("all_admin_notices");
});

add_action(
    "wp_dashboard_setup",
    function () {
        global $wp_meta_boxes;
        $wp_meta_boxes["dashboard"] = [];
        remove_action("welcome_panel", "wp_welcome_panel");
    },
    9999,
);

add_filter("pre_site_transient_update_plugins", "__return_null");
add_filter("pre_site_transient_update_themes", "__return_null");

add_action("admin_footer-index.php", function () {
    global $wpdb;

    $db_version_raw = $wpdb->get_var("SELECT VERSION()");
    $db_is_mariadb = is_string($db_version_raw) && stripos($db_version_raw, "mariadb") !== false;
    $db_type = $db_is_mariadb ? "MariaDB" : "MySQL";
    $db_version = is_string($db_version_raw) ? $db_version_raw : "";

    $curl_info = function_exists("curl_version") ? curl_version() : null;
    $curl_version_text = $curl_info ? $curl_info["version"] : "not available";
    $curl_ssl_text =
        $curl_info && isset($curl_info["ssl_version"]) ? $curl_info["ssl_version"] : "";

    $gd_available = extension_loaded("gd");
    $gd_version =
        $gd_available && function_exists("gd_info")
            ? gd_info()["GD Version"] ?? "enabled"
            : "not available";

    $imagick_available = class_exists("Imagick");
    $opcache_enabled = function_exists("opcache_get_status") && (bool) ini_get("opcache.enable");

    $php_memory_limit = ini_get("memory_limit");
    $php_post_max_size = ini_get("post_max_size");
    $php_upload_max_filesize = ini_get("upload_max_filesize");
    $php_max_execution_time = ini_get("max_execution_time");
    $php_max_input_vars = ini_get("max_input_vars");
    $php_max_input_time = ini_get("max_input_time");

    $max_upload_human = function_exists("size_format")
        ? size_format(wp_max_upload_size())
        : (string) wp_max_upload_size();
    $memory_usage_human = function_exists("size_format")
        ? size_format(memory_get_usage(true))
        : (string) memory_get_usage(true);

    $server_software = isset($_SERVER["SERVER_SOFTWARE"]) ? $_SERVER["SERVER_SOFTWARE"] : "";
    $filesystem_method = function_exists("get_filesystem_method") ? get_filesystem_method() : "";
    $is_multisite_text = is_multisite() ? "yes" : "no";
    $wp_debug_text = defined("WP_DEBUG") && WP_DEBUG ? "true" : "false";

    $items = [
        ["WordPress", get_bloginfo("version")],
        ["Site URL", get_site_url()],
        ["Home URL", home_url()],
        ["Locale", get_locale()],
        ["Multisite", $is_multisite_text],
        ["PHP version", PHP_VERSION],
        ["PHP memory_limit", $php_memory_limit],
        ["post_max_size", $php_post_max_size],
        ["upload_max_filesize", $php_upload_max_filesize],
        ["max_execution_time", $php_max_execution_time],
        ["max_input_vars", $php_max_input_vars],
        ["max_input_time", $php_max_input_time],
        ["OPcache", $opcache_enabled ? "enabled" : "disabled"],
        ["cURL", trim($curl_version_text . " " . $curl_ssl_text)],
        ["GD", $gd_version],
        ["Imagick", $imagick_available ? "enabled" : "not available"],
        ["Database", trim($db_type . " " . $db_version)],
        ["DB host", defined("DB_HOST") ? DB_HOST : ""],
        ["DB charset", $wpdb->charset],
        ["DB collate", $wpdb->collate],
        ["Server software", $server_software],
        ["Filesystem method", $filesystem_method],
        ["WP_DEBUG", $wp_debug_text],
        ["Max upload (WP)", $max_upload_human],
        ["Current memory usage", $memory_usage_human],
    ];

    echo '<style>
    #dashboard-widgets-wrap,#welcome-panel,.notice,.update-nag,#screen-meta,#screen-meta-links{display:none!important}
    .erc-sysinfo-wrap{margin:14px 0 0}
    .erc-sysinfo-card{background:#fff;border:1px solid #e2e4e7;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .erc-sysinfo-head{padding:14px 16px;font-size:18px;font-weight:600;border-bottom:1px solid #eaecef}
    .erc-sysinfo-grid{display:grid;grid-template-columns:1fr 2fr;gap:0;border-top:0}
    .erc-sysinfo-row{display:contents}
    .erc-sysinfo-key,.erc-sysinfo-val{padding:10px 16px;border-top:1px solid #f1f3f5}
    .erc-sysinfo-key{background:#fafbfc;color:#1f2328;font-weight:600}
    .erc-sysinfo-val{background:#fff;word-break:break-all}
    @media (max-width:782px){.erc-sysinfo-grid{grid-template-columns:1fr}.erc-sysinfo-key{border-right:none}}
    </style>';

    echo '<script>document.addEventListener("DOMContentLoaded",function(){var header=document.querySelector(".wrap h1");if(!header){return}var wrap=document.createElement("div");wrap.className="erc-sysinfo-wrap";var card=document.createElement("div");card.className="erc-sysinfo-card";var head=document.createElement("div");head.className="erc-sysinfo-head";head.textContent="Some information about the site";var grid=document.createElement("div");grid.className="erc-sysinfo-grid";card.appendChild(head);card.appendChild(grid);wrap.appendChild(card);header.insertAdjacentElement("afterend",wrap);});</script>';

    echo "<script>";
    echo 'document.addEventListener("DOMContentLoaded",function(){var grid=document.querySelector(".erc-sysinfo-grid"); if(!grid){return;}';
    foreach ($items as $pair) {
        $k = esc_html($pair[0]);
        $v = esc_html((string) $pair[1]);
        echo 'var row=document.createElement("div");row.className="erc-sysinfo-row";var k=document.createElement("div");k.className="erc-sysinfo-key";k.textContent="' .
            $k .
            '";var v=document.createElement("div");v.className="erc-sysinfo-val";v.textContent="' .
            $v .
            '";grid.appendChild(k);grid.appendChild(v);';
    }
    echo "});";
    echo "</script>";
});

// Fix orphans

function fix_orphans_pro($value) {
    if (is_string($value)) {
        $patterns = [
            "/ (\b[aiouwz]\b) /i" => ' $1&nbsp;',
            '/ (\b[aiouwz]\b)$/i' => '&nbsp;$1',
        ];
        return preg_replace(array_keys($patterns), array_values($patterns), $value);
    }
    return $value;
}
add_filter("acf/format_value", "fix_orphans_pro", 10, 3);
add_filter("the_content", "fix_orphans_pro");
add_filter("the_title", "fix_orphans_pro");
