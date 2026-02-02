<?php

get_header();

?>

<main id="main" class="main <?php if(!is_front_page()) { echo 'main--subpage'; } ?>">
    <section class="error-page">
        <div class="container">
            <div class="row align-items-center gy-5">
                <div class="col-lg-7 order-2 order-lg-1">
                    <span class="error-page__badge">Błąd 404</span>
                    <h1>Strona nie została znaleziona</h1>
                    <p>Przepraszamy, ale strona, której szukasz, nie istnieje lub została przeniesiona pod inny adres. Skorzystaj z przycisków poniżej, aby wrócić na bezpieczne tory.</p>
                    <div class="error-page__actions">
                        <a href="<?php echo esc_url(home_url('/')); ?>" class="button button--primary" data-text="Strona główna">Strona główna</a>
                        <a href="javascript:history.back()" class="button button--ghost">Wróć do poprzedniej</a>
                    </div>
                </div>

                <div class="col-lg-5 order-1 order-lg-2 text-center">
                    <div class="error-page__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                </div>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>
