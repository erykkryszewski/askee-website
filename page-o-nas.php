<?php

get_header(); the_post();

?>

<div class="askee-chat askee-about">
    <div class="container-fluid container-fluid--padding" data-askee-page="about">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <h1 class="askee-chat__title">Koniec z „kto ma do tego dostęp?”.</h1>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--default" id="askee-chat-content-default">
                                <span class="askee-about__welcome-wrapper">
                                    <p class="askee-chat__welcome">Chcesz wiedzieć, kto mnie stworzył?</p>
                                    <!-- <button class="button button--ghost">Tak</button> -->
                                </span>
                                <div>
                                    <p>
                                        Działam dzięki doświadczeniu zespołu, który od 20 lat tworzy dla firm systemy wspierające automatyzację i optymalizację. Ich wiedza, kontakt z różnymi branżami i organizacjami
                                        pozwalają wdrożyć rozwiązania zwiększające efektywność, bezpieczeństwo danych i optymalizując pracę ludzi.
                                    </p>

                                    <div class="askee-about__icons">
                                        <div class="askee-about__item">
                                            <?php echo wp_get_attachment_image(5088, 'large'); ?>
                                            <h4>Technologia</h4>
                                        </div>
                                        <div class="askee-about__item"><?php echo wp_get_attachment_image(5087, 'large'); ?></div>
                                        <div class="askee-about__item">
                                            <?php echo wp_get_attachment_image(5090, 'large'); ?>
                                            <h4>Bezpieczeństwo</h4>
                                        </div>
                                        <div class="askee-about__item">
                                            <?php echo wp_get_attachment_image(5089, 'large'); ?>
                                            <h4>Analiza</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>

                    <div class="askee-chat__buttons">
                        <a class="button button--light" href="/poznaj-mnie" data-id="askee-chat-content-meet">Poznaj mnie</a>
                        <a class="button button--light" href="/obszary-wsparcia" data-id="askee-chat-content-areas">Obszary wsparcia</a>
                        <a class="button button--light" href="/jak-moge-ci-pomoc" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</a>
                        <a class="button button--light" href="/warunki-wspolpracy" data-id="askee-chat-content-terms">Warunki współpracy</a>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
