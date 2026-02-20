<?php

get_header();

$askee_current_category = get_queried_object();
$askee_category_slug = "";
if ($askee_current_category instanceof WP_Term) {
    $askee_category_slug = $askee_current_category->slug;
}

?>

<div class="askee-chat askee-blog">
    <div
        class="container-fluid container-fluid--padding"
        data-askee-page="category"
        <?php if ("" !== $askee_category_slug): ?>
            data-askee-category-slug="<?php echo esc_attr($askee_category_slug); ?>"
        <?php endif; ?>
    >
        <div class="row askee-blog__row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper askee-blog__wrapper">
                    <?php get_template_part("template-parts/blog-grid"); ?>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php

get_footer();

?>
