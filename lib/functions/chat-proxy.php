<?php

if (!defined("ABSPATH")) {
    exit();
}

add_action("rest_api_init", function () {
    register_rest_route("askee/v1", "/chat", [
        "methods" => "POST",
        "callback" => "askee_chat_proxy_callback",
        "permission_callback" => "__return_true",
    ]);
});

function askee_chat_proxy_callback(WP_REST_Request $request) {
    $nonce = $request->get_header("x-wp-nonce");

    if (!$nonce || !wp_verify_nonce($nonce, "wp_rest")) {
        return new WP_REST_Response(["ok" => false, "error" => "invalid_nonce"], 403);
    }

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

    $payload = [
        "Input" => $input,
    ];

    $response = wp_remote_post($webhook_url, [
        "timeout" => 20,
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

    $status = (int) wp_remote_retrieve_response_code($response);
    $body = (string) wp_remote_retrieve_body($response);

    $decoded = null;
    if ($body !== "") {
        $decoded = json_decode($body, true);
    }

    return new WP_REST_Response(
        [
            "ok" => $status >= 200 && $status < 300,
            "status" => $status,
            "raw" => $body,
            "json" => $decoded,
        ],
        200,
    );
}
