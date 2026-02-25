<?php

get_header(); the_post();

?>

<div class="askee-chat askee-contact">
    <div class="container-fluid container-fluid--padding" data-askee-page="contact" data-askee-topic="kontakt">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__user-message">
                                <p></p>
                                <div class="askee-chat__profile-picture">
                                    <img src="<?php echo get_template_directory_uri(); ?>/images/hr-payroll.svg" alt="user-profile-picture" />
                                </div>
                            </div>
                            <div class="askee-chat__content askee-chat__content--default askee-chat__content--active" id="askee-chat-content-default">
                                <p class="askee-chat__welcome">Jeśli masz ochotę się z nami skontaktować, jestem tu, by to ułatwić.</p>

                                <div class="askee-chat__text-with-image">
                                    <div><?php echo wp_get_attachment_image(5141, 'large', '', ['class' => 'askee-welcome-img']); ?></div>
                                    <p>Możemy umówić spotkanie, możesz przekazać mi informacje, a ja zajmę się resztą, lub mogę podpowiedzieć, gdzie spotkasz nas na żywo w najbliższym czasie. Co wybierasz?</p>
                                </div>

                                <div class="askee-chat__info-buttons askee-chat__info-buttons--suggestions">
                                    <button type="button" class="button button--ghost">Chcę umówić spotkanie.</button>
                                    <button type="button" class="button button--ghost">Chcę przekazać Wam informację.</button>
                                    <button type="button" class="button button--ghost">Chcę zobaczyć, gdzie będę mógł Was spotkać na wydarzeniu.</button>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Masz pytania? Jesteś zainteresowany/-a ASKEE? Odezwij się do nas!" required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>

                    <div class="askee-chat__buttons">
                        <a class="button button--light" href="/poznaj-mnie/" data-id="askee-chat-content-meet">Poznaj mnie</a>
                        <a class="button button--light" href="/obszary-wsparcia/" data-id="askee-chat-content-areas">Obszary wsparcia</a>
                        <a class="button button--light" href="/jak-moge-ci-pomoc/" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</a>
                        <a class="button button--light" href="/warunki-wspolpracy/" data-id="askee-chat-content-terms">Warunki współpracy</a>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
