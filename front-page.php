<?php

get_header(); the_post();

?>

<div class="askee-homepage">
    <div class="container-fluid container-fluid--padding" data-askee-page="home">
        <div class="askee-homepage__wrapper">
            <div class="askee-homepage__slider">
                <div class="row">
                    <div class="col-12">
                        <div class="askee-homepage__welcome">
                            <h1>
                                Cześć!
                                <span>Jestem Twoim Asystentem Askee.</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-lg-8 offset-lg-2">
                        <div class="askee-homepage__content">
                            <div class="askee-homepage__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                            <div class="askee-homepage__boxes">
                                <div class="askee-homepage__box">
                                    <p>Pomagam w codziennej pracy. W jednym miejscu, bez przełączania się między systemami i aplikacjami.</p>
                                </div>
                                <div class="askee-homepage__box">
                                    <p>Wystarczy, że zadasz pytanie lub zlecisz zadanie –odpowiem albo zrobię to za Ciebie. Szybko, prosto i w sposób dopasowany do Twojej roli.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
