<?php
/**
 * This file adds ACF integration.
 *
 * @package askeetheme
 * @license GPL-3.0-or-later
 */

add_action("acf/init", "askeetheme_acf_init");
/**
 * Registers ACF blocks for Gutenberg
 *
 * @since  1.0.0
 * @return void
 */
function askeetheme_acf_init() {
    add_filter(
        "block_categories_all",
        function ($categories, $post) {
            return array_merge($categories, [
                [
                    "slug" => "askeetheme",
                    "title" => __("askee Theme Blocks", "askeetheme"),
                ],
            ]);
        },
        10,
        2,
    );

    // Check if function exists.
    if (function_exists("acf_register_block")) {
        $blocks = require get_stylesheet_directory() . "/acf/blocks.php";

        if (is_array($blocks)) {
            foreach ($blocks as $name => $params) {
                $params = array_merge($params, [
                    "name" => $name,
                    "mode" => "edit",
                    "render_callback" => "askeetheme_block_render_callback",
                ]);

                // Register a block.
                acf_register_block($params);
            }
        }

        function askeetheme_block_render_callback($block) {
            $slug = str_replace("acf/", "", $block["name"]);

            if (file_exists(get_theme_file_path("/acf/blocks/{$slug}.php"))) {
                include get_theme_file_path("/acf/blocks/{$slug}.php");
            }
        }
    }

    if (function_exists("acf_add_options_page")) {
        acf_add_options_page([
            "page_title" => "Ustawienia globalne",
            "parent_slug" => "themes.php",
        ]);
    }
}

/**
 * Renders block content
 *
 * @since  1.0.0
 * @param  string $block Block data.
 * @return void
 */
add_filter(
    "render_block",
    function ($block_content, $block) {
        if (preg_match("~^core/|core-embed/~", $block["blockName"])) {
            $block_content = sprintf(
                '<div class="default-block container">%s</div>',
                $block_content,
            );
        }

        return $block_content;
    },
    PHP_INT_MAX - 1,
    2,
);

add_filter("acf/settings/save_json", "askeetheme_acf_json_save_point");
/**
 * Sets the ACF JSON saving point
 *
 * @since  1.0.0
 * @param  string $path Saving point path.
 * @return string       Saving point path.
 */
function askeetheme_acf_json_save_point($path) {
    return get_stylesheet_directory() . "/acf/local-json";
}

add_filter("acf/settings/load_json", "askeetheme_acf_json_load_point");
/**
 * Sets the ACF JSON loading point
 *
 * @since  1.0.0
 * @param  array $paths JSON loading points.
 * @return array        JSON loading points.
 */
function askeetheme_acf_json_load_point($paths) {
    unset($paths[0]);
    $paths[] = get_stylesheet_directory() . "/acf/local-json";
    return $paths;
}
