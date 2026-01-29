<?php

add_action("pre_get_posts", function ($q) {
    if (!is_admin() && $q->is_main_query() && $q->is_search()) {
        $q->set("post_type", ["my_custom_post_type", "post"]);
    }
});
