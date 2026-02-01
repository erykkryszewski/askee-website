<?php

get_header(); global $post; $post = get_post();

?>

<div class="askee-chat askee-blog">
    <div class="container-fluid container-fluid--padding" data-askee-page="chat">
        <div class="row askee-blog__row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper askee-blog__Wrapper">
                    <div class="askee-chat__box askee-chat__box--blog">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--blog" id="askee-chat-content-blog">
                                <p class="askee-chat__welcome askee-blog__welcome">
                                    <span class="askee-blog__date">12.02.2025</span>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                </p>
                                <div></div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>
                    <div class="askee-chat__box askee-chat__box--blog">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--blog" id="askee-chat-content-blog">
                                <p class="askee-chat__welcome askee-blog__welcome">
                                    <span class="askee-blog__date">12.02.2025</span>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                </p>
                                <div></div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>
                    <div class="askee-chat__box askee-chat__box--blog">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--blog" id="askee-chat-content-blog">
                                <p class="askee-chat__welcome askee-blog__welcome">
                                    <span class="askee-blog__date">12.02.2025</span>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                </p>
                                <div></div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
