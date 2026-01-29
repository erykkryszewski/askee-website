<?php

$shop_filtration_id = get_field("shop_filtration_id", "options"); ?>

<div class="product-filters"><?php echo do_shortcode(
    '[searchandfilter id="' . $shop_filtration_id . '"]',
); ?></div>
