<?php

get_header(); the_post();

$askee_contact_honeypot_field_name = defined("ASKEE_CONTACT_HONEYPOT_FIELD_NAME")
    ? ASKEE_CONTACT_HONEYPOT_FIELD_NAME
    : "askee_website_url";

?>

<div class="askee-chat askee-contact">
    <div class="container-fluid container-fluid--padding" data-askee-page="contact" data-askee-topic="kontakt">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <form class="askee-contact-form" novalidate>
                            <div class="askee-contact-form__intro">
                                <div class="askee-contact-form__intro-image">
                                    <?php echo wp_get_attachment_image(5188, 'thumbnail', '', ['class' => 'askee-welcome-img', 'alt' => '']); ?>
                                </div>
                                <p class="askee-contact-form__intro-text">
                                    Jeśli masz ochotę się z nami skontaktować, jestem tu, by to ułatwić. Zostaw kilka informacji, a odezwiemy się najszybciej, jak to możliwe.
                                </p>
                            </div>

                            <div class="askee-contact-form__grid">
                                <div class="askee-contact-form__field">
                                    <label for="askee-contact-name" class="askee-contact-form__label">Imię i nazwisko</label>
                                    <input
                                        type="text"
                                        id="askee-contact-name"
                                        name="name"
                                        class="askee-contact-form__input"
                                        autocomplete="name"
                                        maxlength="120"
                                        required
                                    />
                                </div>

                                <div class="askee-contact-form__field">
                                    <label for="askee-contact-email" class="askee-contact-form__label">E-mail</label>
                                    <input
                                        type="email"
                                        id="askee-contact-email"
                                        name="email"
                                        class="askee-contact-form__input"
                                        autocomplete="email"
                                        maxlength="190"
                                        required
                                    />
                                </div>

                                <div class="askee-contact-form__field askee-contact-form__field--full">
                                    <label for="askee-contact-phone" class="askee-contact-form__label">Telefon</label>
                                    <input
                                        type="tel"
                                        id="askee-contact-phone"
                                        name="phone"
                                        class="askee-contact-form__input"
                                        autocomplete="tel"
                                        inputmode="tel"
                                        maxlength="32"
                                        required
                                    />
                                </div>

                                <div class="askee-contact-form__field askee-contact-form__field--full">
                                    <label for="askee-contact-message" class="askee-contact-form__label">Treść wiadomości</label>
                                    <textarea
                                        id="askee-contact-message"
                                        name="message"
                                        class="askee-contact-form__textarea"
                                        rows="5"
                                        minlength="10"
                                        maxlength="3000"
                                        required
                                    ></textarea>
                                </div>

                                <div class="askee-contact-form__field askee-contact-form__field--checkbox">
                                    <input
                                        type="checkbox"
                                        id="askee-contact-consent"
                                        name="consent"
                                        class="askee-contact-form__checkbox"
                                        value="1"
                                        required
                                    />
                                    <label for="askee-contact-consent" class="askee-contact-form__label askee-contact-form__label--checkbox">
                                        Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zapytania zgodnie z <a href="/polityka-prywatnosci/">Polityką prywatności</a>.
                                    </label>
                                </div>

                                <div class="askee-contact-form__field askee-contact-form__field--honeypot" aria-hidden="true">
                                    <label for="<?php echo esc_attr($askee_contact_honeypot_field_name); ?>">Adres www (nie wypełniaj)</label>
                                    <input
                                        type="text"
                                        id="<?php echo esc_attr($askee_contact_honeypot_field_name); ?>"
                                        name="<?php echo esc_attr($askee_contact_honeypot_field_name); ?>"
                                        autocomplete="off"
                                        tabindex="-1"
                                    />
                                </div>
                            </div>

                            <input type="hidden" name="form_loaded_at_timestamp" value="<?php echo esc_attr(time()); ?>" />

                            <p class="askee-contact-form__status" aria-live="polite"></p>

                            <div class="askee-contact-form__actions">
                                <button type="submit" class="askee-contact-form__submit">Wyślij wiadomość</button>
                            </div>
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
