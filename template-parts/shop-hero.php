<?php

$taxonomy_name = get_the_archive_title(); ?>

<div class="shop-hero">
    <div class="container">
        <h1 class="shop-hero__title"><?php echo apply_filters("the_title", $taxonomy_name); ?></h1>
    </div>
</div>
