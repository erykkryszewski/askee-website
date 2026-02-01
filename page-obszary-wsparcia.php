<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="chat">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <h1 class="askee-chat__title">Koniec z „kto ma do tego dostęp?”.</h1>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--areas askee-chat__content--active" id="askee-chat-content-areas">
                                <p class="askee-chat__welcome">
                                    Mam wiele specjalizacji, dzięki którym wspieram organizacje w codziennej pracy. Możesz poznać je według obszarów działania albo Twojej roli w firmie - chętnie opowiem Ci o tym.
                                </p>
                                <div>
                                    <p><strong>Poznaj mnie bliżej.</strong></p>
                                    <p>
                                        Cześć, jestem ASKee – Twój asystent w organizacji. Pomagam w pracy działać szybciej, mądrzej i w zgodzie z zasadami firmy. Potrafię zarządzać danymi, wiedzą i doświadczeniem w 4
                                        obszarach.
                                    </p>
                                    <p>Kliknij w obszar, który mam Ci opisać.</p>
                                </div>
                                <div class="askee-chat__inner-buttons askee-chat__inner-buttons--areas">
                                    <button class="button button--ghost button--hr-payroll">ASKee Kadry</button>
                                    <button class="button button--ghost button--hr">ASKee HR</button>
                                    <button class="button button--ghost button--compliance">ASKee Compliance</button>
                                    <button class="button button--ghost button--know-how">ASKee Know</button>
                                    <button class="button button--ghost button--admin-structure-reports">ASKee Settings, Structure & Reports</button>
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
