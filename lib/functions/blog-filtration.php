<?php

if (!defined("ABSPATH")) {
    exit();
}

function askee_get_blog_base_url() {
    $posts_page_id = (int) get_option("page_for_posts");
    if ($posts_page_id > 0) {
        $posts_page_url = get_permalink($posts_page_id);
        if (is_string($posts_page_url) && "" !== $posts_page_url) {
            return $posts_page_url;
        }
    }

    return home_url("/blog/");
}

function askee_get_blog_filter_state() {
    $sort_value = isset($_GET["askee_sort"])
        ? sanitize_key(wp_unslash($_GET["askee_sort"]))
        : "newest";
    if ("oldest" !== $sort_value) {
        $sort_value = "newest";
    }

    $category_slug = isset($_GET["askee_category"])
        ? sanitize_title(wp_unslash($_GET["askee_category"]))
        : "";
    if ("" !== $category_slug) {
        $category_term = get_term_by("slug", $category_slug, "category");
        if (!$category_term instanceof WP_Term) {
            $category_slug = "";
        }
    }

    $search_value = isset($_GET["askee_search"])
        ? sanitize_text_field(wp_unslash($_GET["askee_search"]))
        : "";

    if ("" === $category_slug && is_category()) {
        $queried_term = get_queried_object();
        if ($queried_term instanceof WP_Term && "category" === $queried_term->taxonomy) {
            $category_slug = $queried_term->slug;
        }
    }

    return [
        "sort" => $sort_value,
        "category" => $category_slug,
        "search" => $search_value,
    ];
}

function askee_get_blog_filter_categories() {
    return get_categories([
        "taxonomy" => "category",
        "orderby" => "name",
        "order" => "ASC",
        "hide_empty" => true,
    ]);
}

function askee_apply_blog_filters_to_query($query) {
    if (!($query instanceof WP_Query)) {
        return;
    }

    if (is_admin() || !$query->is_main_query()) {
        return;
    }

    if (!is_home() && !is_category()) {
        return;
    }

    $filter_state = askee_get_blog_filter_state();

    $query->set("post_type", "post");
    $query->set("orderby", "date");
    $query->set("order", "oldest" === $filter_state["sort"] ? "ASC" : "DESC");

    if ("" !== $filter_state["search"]) {
        $query->set("s", $filter_state["search"]);
    }

    if ("" !== $filter_state["category"] && !is_category()) {
        $query->set("category_name", $filter_state["category"]);
    }
}
add_action("pre_get_posts", "askee_apply_blog_filters_to_query");
