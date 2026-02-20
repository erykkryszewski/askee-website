<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="chat">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <div class="askee-chat__title-rotator">
                        <h1 class="askee-chat__title">Askee działa w środku Twojej organizacji — na jej danych, procesach i strukturze.</h1>
                        <h2 class="askee-chat__title">Zna Twoją rolę, cele i uprawnienia — dlatego odpowiada dokładnie tak, jak trzeba.</h2>
                        <h2 class="askee-chat__title">Pomaga podejmować decyzje szybciej i skutecznie wspiera w codziennych zadaniach operacyjnych.</h2>
                        <h2 class="askee-chat__title">Nie tylko odpowiada — realizuje zadania i podpowiada, co warto zrobić dalej.</h2>
                        <h2 class="askee-chat__title">Łączy ludzi, dane i procesy w jedno inteligentne centrum zarządzania.</h2>
                    </div>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--default" id="askee-chat-content-default">
                                <p class="askee-chat__welcome">
                                    Hej, to ja -
                                    <span>Twój asystent!</span>
                                </p>
                                <div></div>
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
