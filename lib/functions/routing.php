<?php

if (!defined("ABSPATH")) {
    exit();
}

function askee_register_theme_config() {
    if (!wp_script_is("askeetheme-main", "enqueued")) {
        return;
    }

    $config_array = [
        "contentSelector" => "#askee-app-content",
        "loadingBodyClass" => "askee-is-loading",
        "ajaxHeaderName" => "X-ASKEE-PJAX",
        "ajaxHeaderValue" => "1",
        "chatRoutes" => [
            "askee-chat-content-default" => home_url("/chat/"),
            "askee-chat-content-letstalk" => home_url("/porozmawiajmy/"),
            "askee-chat-content-meet" => home_url("/poznaj-mnie/"),
            "askee-chat-content-areas" => home_url("/obszary-wsparcia/"),
            "askee-chat-content-help" => home_url("/jak-moge-ci-pomoc/"),
            "askee-chat-content-terms" => home_url("/warunki-wspolpracy/"),
        ],
    ];

    wp_add_inline_script(
        "askeetheme-main",
        "window.AskeeThemeConfig = " . wp_json_encode($config_array) . ";",
        "before",
    );
}
add_action("wp_enqueue_scripts", "askee_register_theme_config", 20);

function askee_register_chat_config() {
    if (!wp_script_is("askeetheme-main", "enqueued")) {
        return;
    }

    $config_array = [
        "restUrl" => esc_url_raw(rest_url("askee/v1/chat")),
        "nonce" => wp_create_nonce("wp_rest"),
        "storageKey" => "askee_chat_state_v1",
    ];

    wp_add_inline_script(
        "askeetheme-main",
        "window.AskeeChatConfig = " . wp_json_encode($config_array) . ";",
        "before",
    );
}
add_action("wp_enqueue_scripts", "askee_register_chat_config", 21);

function askee_is_pjax_request() {
    if (isset($_SERVER["HTTP_X_ASKEE_PJAX"]) && $_SERVER["HTTP_X_ASKEE_PJAX"] === "1") {
        return true;
    }
    return false;
}
