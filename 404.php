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
                        <a href="<?php echo esc_url(home_url('/')); ?>" class="button" data-text="Strona główna">Strona główna</a>
                        <a href="javascript:history.back()" class="button button--ghost">Wróć do poprzedniej</a>
                    </div>
                </div>

                <div class="col-lg-5 order-1 order-lg-2 text-center">
                    <svg class="error-page__svg" viewBox="0 0 400 350" xmlns="http://www.w3.org/2000/svg">
                        <rect class="svg-bg" x="50" y="50" width="250" height="250" rx="<?php echo str_replace('px', '', 0); ?>" />
                        <g class="svg-content">
                            <rect class="svg-line svg-line--theme" x="90" y="100" width="120" height="10" rx="5" />
                            <rect class="svg-line" x="90" y="130" width="170" height="10" rx="5" />
                            <rect class="svg-line" x="90" y="160" width="150" height="10" rx="5" />
                            <rect class="svg-line" x="90" y="190" width="100" height="10" rx="5" />
                        </g>
                        <g class="svg-search">
                            <circle class="svg-search__circle" cx="280" cy="240" r="45" />
                            <line class="svg-search__handle" x1="315" y1="275" x2="350" y2="310" />
                            <path class="svg-search__cross" d="M265 225 L295 255 M295 225 L265 255" />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>
