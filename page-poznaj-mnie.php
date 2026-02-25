<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="meet" data-askee-topic="poznaj-mnie">
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
                            <div class="askee-chat__content askee-chat__content--meet askee-chat__content--active" id="askee-chat-content-meet">
                                <p class="askee-chat__welcome">Skoro chcesz mnie lepiej poznać, wyjaśnię Ci, kim jestem.</p>

                                <div class="askee-chat__text-with-image">
                                    <div><?php echo wp_get_attachment_image(5190, 'large', '', ['class' => 'askee-welcome-img']); ?></div>
                                    <p>
                                        Jestem Twoim cyfrowym asystentem, który zna Twoją organizację od środka. Łączę wiedzę o strukturze, procesach i danych, aby ułatwić Ci podejmowanie decyzji. Nie tylko odpowiadam na
                                        pytania, ale też wspieram działanie, tam, gdzie tego potrzebujesz.
                                    </p>
                                </div>

                                <div class="askee-chat__info-buttons askee-chat__info-buttons--suggestions">
                                    <button type="button" class="button button--ghost">Pokaż, jak pomagasz mi w codziennych decyzjach.</button>
                                    <button type="button" class="button button--ghost">Jak sprawiasz, że wszystko, czego potrzebuję, jest w jednym miejscu?</button>
                                    <button type="button" class="button button--ghost">Jak możesz wspierać mnie w szerszych działaniach z zespołem?</button>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

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
