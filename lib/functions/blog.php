<?php

// add pagination to blog page
function pagination() {
    global $wp_query;

    if ($wp_query->max_num_pages > 1) {
        $links = paginate_links(["type" => "list", "next_text" => "", "prev_text" => ""]);
        return str_replace(["page-numbers"], [""], $links);
    }
    return "";
} // add sidebar add_action("widgets_init", "my_register_sidebars");
function my_register_sidebars() {
    register_sidebar([
        "id" => "askeetheme-sidebar",
        "name" => __("askee Sidebar"),
        "description" => __("This is a blog sidebar."),
        "before_widget" => '
<div class="sidebar__item">',
        "after_widget" => "</div>
",
        "before_title" => "
<h3>",
        "after_title" => "</h3>
",
    ]);
}
