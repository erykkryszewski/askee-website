<?php

if (!defined("ABSPATH")) {
    exit();
}

function askee_register_theme_config() {
    if (!wp_script_is("askeetheme-main", "enqueued")) {
        return;
    }

    $config_array = [
        "rootUrl" => home_url("/"),
        "contentSelector" => "#askee-app-content",
        "loadingBodyClass" => "askee-is-loading",
        "ajaxHeaderName" => "X-ASKEE-PJAX",
        "ajaxHeaderValue" => "1",
    ];

    wp_add_inline_script(
        "askeetheme-main",
        "window.AskeeThemeConfig = " . wp_json_encode($config_array) . ";",
        "before",
    );
}
add_action("wp_enqueue_scripts", "askee_register_theme_config", 20);
