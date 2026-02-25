<?php

global $wp_query;

$askee_category_icon_map = [
    "biznes" => "fa-solid fa-briefcase",
    "sztuczna-inteligencja" => "fa-solid fa-lightbulb",
    "hr" => "fa-solid fa-user-group",
    "aktualnosci" => "fa-solid fa-newspaper",
    "technologia" => "fa-solid fa-microchip",
];
$askee_default_category_icon = $askee_category_icon_map["aktualnosci"];
$askee_default_thumbnail_id = 5091;
$askee_post_index = 0;
$askee_visible_posts_count = isset($wp_query) ? (int) $wp_query->post_count : 0;
$askee_has_featured_layout = $askee_visible_posts_count > 4;
$askee_blog_filter_categories = get_categories([
    "taxonomy" => "category",
    "orderby" => "name",
    "order" => "ASC",
    "hide_empty" => true,
]);
$askee_blog_url = home_url("/blog/");
$askee_active_category_slug = "";
if (is_category()) {
    $askee_current_category = get_queried_object();
    if ($askee_current_category instanceof WP_Term) {
        $askee_active_category_slug = $askee_current_category->slug;
    }
}
$askee_list_category_slug = "" !== $askee_active_category_slug ? $askee_active_category_slug : "all";
?>
<div class="askee-blog__filtration">
    <div class="askee-blog__filtration-item">
        <a
            class="button button--ghost askee-blog__filter-button<?php if (
                "" === $askee_active_category_slug
            ) {
                echo " askee-blog__filter-button--active";
            } ?>"
            href="<?php echo esc_url($askee_blog_url); ?>"
        >
            <?php esc_html_e("Wszystkie", "askeetheme"); ?>
        </a>
    </div>
    <?php foreach ($askee_blog_filter_categories as $askee_filter_category): ?>
        <?php if (!$askee_filter_category instanceof WP_Term) {
            continue;
        } ?>
        <?php $askee_filter_category_link = get_category_link($askee_filter_category->term_id); ?>
        <?php if (is_wp_error($askee_filter_category_link)) {
            continue;
        } ?>
        <div class="askee-blog__filtration-item">
            <a
                class="button button--ghost askee-blog__filter-button<?php if (
                    $askee_active_category_slug === $askee_filter_category->slug
                ) {
                    echo " askee-blog__filter-button--active";
                } ?>"
                href="<?php echo esc_url($askee_filter_category_link); ?>"
            >
                <?php echo esc_html($askee_filter_category->name); ?>
            </a>
        </div>
    <?php endforeach; ?>
</div>
<?php if (have_posts()): ?>
    <div class="askee-blog__list askee-blog__list--<?php echo esc_attr(
        $askee_list_category_slug,
    ); ?><?php if ($askee_has_featured_layout) {
        echo " askee-blog__list--with-featured";
    } ?>">
        <?php while (have_posts()):
            the_post(); ?>
            <?php
            $askee_post_index++;
            $askee_is_featured_post = $askee_has_featured_layout && 1 === $askee_post_index;

            $askee_post_categories = get_the_category();
            $askee_post_category =
                !empty($askee_post_categories) && isset($askee_post_categories[0])
                    ? $askee_post_categories[0]
                    : null;

            $askee_post_category_slug =
                $askee_post_category instanceof WP_Term ? $askee_post_category->slug : "";
            $askee_post_category_name =
                $askee_post_category instanceof WP_Term
                    ? $askee_post_category->name
                    : __("Aktualnosci", "askeetheme");

            $askee_post_category_icon = isset($askee_category_icon_map[$askee_post_category_slug])
                ? $askee_category_icon_map[$askee_post_category_slug]
                : $askee_default_category_icon;

            $askee_author_id = (int) get_the_author_meta("ID");
            $askee_author_pseudonim = trim(
                (string) get_the_author_meta("pseudonim", $askee_author_id),
            );
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_user_meta($askee_author_id, "pseudonim", true),
                );
            }
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_the_author_meta("nickname", $askee_author_id),
                );
            }
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_the_author_meta("display_name", $askee_author_id),
                );
            }

            $askee_post_image_id = has_post_thumbnail()
                ? get_post_thumbnail_id()
                : $askee_default_thumbnail_id;

            $askee_post_excerpt = "";
            if ($askee_is_featured_post) {
                if (has_excerpt()) {
                    $askee_post_excerpt = trim((string) get_the_excerpt());
                } else {
                    $askee_raw_content = (string) get_the_content(null, false, get_the_ID());
                    $askee_clean_content = trim(
                        wp_strip_all_tags(strip_shortcodes($askee_raw_content)),
                    );
                    $askee_clean_content = preg_replace("/\s+/", " ", $askee_clean_content);

                    if (!empty($askee_clean_content)) {
                        if (
                            preg_match_all(
                                "/[^.!?]*[.!?]+/u",
                                $askee_clean_content,
                                $askee_sentence_matches,
                            )
                        ) {
                            $askee_sentences = array_slice($askee_sentence_matches[0], 0, 5);
                            $askee_post_excerpt = trim(implode(" ", $askee_sentences));
                        }

                        if ("" === $askee_post_excerpt) {
                            $askee_post_excerpt = $askee_clean_content;
                        }
                    }
                }

                if ("" !== $askee_post_excerpt) {
                    $askee_needs_ellipsis = false;

                    if (function_exists("mb_strlen") && function_exists("mb_substr")) {
                        if (mb_strlen($askee_post_excerpt) > 300) {
                            $askee_post_excerpt = mb_substr($askee_post_excerpt, 0, 300);
                            $askee_needs_ellipsis = true;
                        }
                    } else {
                        if (strlen($askee_post_excerpt) > 300) {
                            $askee_post_excerpt = substr($askee_post_excerpt, 0, 300);
                            $askee_needs_ellipsis = true;
                        }
                    }

                    if ($askee_needs_ellipsis) {
                        $askee_post_excerpt =
                            rtrim($askee_post_excerpt, " \t\n\r\0\x0B,.!?-") . "...";
                    }
                }
            }
            ?>
<article id="post-<?php the_ID(); ?>" data-id="<?php the_ID(); ?>" class="askee-blog__post<?php if (
    $askee_is_featured_post
) {
    echo " askee-blog__post--featured";
} ?>">
                <a class="askee-blog__post-link" href="<?php the_permalink(); ?>">
                    <div class="askee-blog__post-media">
                        <?php echo wp_get_attachment_image($askee_post_image_id, "large", false, [
                            "class" => "askee-blog__post-image object-fit-cover",
                            "loading" => "lazy",
                        ]); ?>
                    </div>

                    <div class="askee-blog__post-content">
                        <div>
                            <span class="askee-blog__post-category text-small">
                                <i
                                    class="askee-blog__post-category-icon <?php echo esc_attr(
                                        $askee_post_category_icon ?: "fa-regular fa-folder",
                                    ); ?>"
                                    aria-hidden="true"
                                ></i>
                                <span><?php echo esc_html($askee_post_category_name); ?></span>
                            </span>
    
                            <h2 class="askee-blog__post-title h3 mt-15"><?php the_title(); ?></h2>
    
                            <?php if ($askee_is_featured_post && "" !== $askee_post_excerpt): ?>
                                <p class="askee-blog__post-excerpt paragraph text-medium mt-10"><?php echo esc_html(
                                    $askee_post_excerpt,
                                ); ?></p>
                            <?php endif; ?>
                        </div>

                        <div class="askee-blog__post-meta mt-10">
                            <span class="askee-blog__post-author text-small">
                                <span class="askee-blog__post-author-avatar">
                                    <?php echo get_avatar($askee_author_id, 32, "", "", [
                                        "class" => "askee-blog__post-author-image object-fit-cover",
                                    ]); ?>
                                </span>
                                <span class="askee-blog__post-author-name"><?php echo esc_html(
                                    $askee_author_pseudonim,
                                ); ?></span>
                            </span>

                            <time
                                class="askee-blog__post-date text-small"
                                datetime="<?php echo esc_attr(get_the_date("c")); ?>"
                            >
                                <?php echo esc_html(get_the_date()); ?>
                            </time>
                        </div>
                    </div>
                </a>
            </article>
        <?php
        endwhile; ?>
    </div>
<?php else: ?>
    <p class="askee-blog__empty paragraph"><?php esc_html_e(
        "Brak wpisow do wyswietlenia.",
        "askeetheme",
    ); ?></p>
<?php endif;
?>
