<?php

get_header();
the_post();
?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="chat">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <h1 class="askee-chat__title">Koniec z „kto ma do tego dostęp?”.</h1>

                    <div class="askee-chat__box">
                        <div class="askee-chat__content askee-chat__content--conversation">

                        </div>
                        <div class="askee-chat__content askee-chat__content--default askee-chat__content--active" id="askee-chat-content-default">
                            <p class="askee-chat__welcome">Hej, to ja - <span>Twój asystent!</span></p>
                        </div>
                        <div class="askee-chat__content askee-chat__content--letstalk" id="askee-chat-content-letstalk">
                            <p class="askee-chat__welcome">Opowiem, jak pracuję. Jeśli chcesz porozmawiać z moimi twórcami, zostaw dane kontaktowe lub wybierz termin spotkania, który Ci pasuje. </p>
                        </div>
                        <div class="askee-chat__content askee-chat__content--meet" id="askee-chat-content-meet">
                            <p class="askee-chat__welcome">Jestem Twoim asystentem w codziennej pracy. Zapewniam szybki dostęp do potrzebnych informacji w jednym i prostym interfejsie. Pomogę Ci oszczędzić czas, ograniczę szukanie w wielu źródłach, wspieram w realizacji kluczowych zadań.</p>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci unde minima eveniet. Officiis rem ratione maxime aliquam, blanditiis laborum debitis voluptas aut quisquam eos laudantium itaque ducimus libero minus voluptatem aliquid nisi explicabo voluptates nesciunt iste vero, numquam quasi quam fuga? Earum, officiis iure. Saepe enim quidem doloremque, inventore, magni culpa natus quia quisquam doloribus autem itaque laboriosam adipisci ratione possimus laborum sunt eos nihil eius ducimus nulla esse.</p>
                        </div>
                        <div class="askee-chat__content askee-chat__content--areas" id="askee-chat-content-areas">
                            <p class="askee-chat__welcome">Mam wiele specjalizacji, dzięki którym wspieram organizacje w codziennej pracy. Możesz poznać je według obszarów działania albo Twojej roli w firmie - chętnie opowiem Ci o tym.</p>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci unde minima eveniet. Officiis rem ratione maxime aliquam, blanditiis laborum debitis voluptas aut quisquam eos laudantium itaque ducimus libero minus voluptatem aliquid nisi explicabo voluptates nesciunt iste vero, numquam quasi quam fuga?</p>
                        </div>
                        <div class="askee-chat__content askee-chat__content--help" id="askee-chat-content-help">
                            <p class="askee-chat__welcome">ASKEE – jeden asystent, wiele ról, jedno miejsce pracy</p>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci unde minima eveniet. Officiis rem ratione maxime aliquam, blanditiis laborum debitis voluptas aut quisquam eos laudantium itaque ducimus libero minus voluptatem aliquid nisi explicabo voluptates nesciunt iste vero, numquam quasi quam fuga? Earum, officiis iure. Saepe enim quidem doloremque, inventore, magni culpa natus quia quisquam doloribus autem itaque laboriosam adipisci ratione possimus laborum sunt eos nihil eius ducimus nulla esse. Incidunt molestias sequi illo eum, accusamus dolor id quibusdam veniam dolorem ab soluta optio eligendi dicta alias vel, dolorum ullam unde voluptate. Error amet dolore odio tenetur aliquid eius minima magnam!</p>
                        </div>
                        <div class="askee-chat__content askee-chat__content--terms" id="askee-chat-content-terms">
                            <p class="askee-chat__welcome">ASKEE – brakuje tekstu i widoku dla terms</p>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci unde minima eveniet. Officiis rem ratione maxime aliquam, blanditiis laborum debitis voluptas aut quisquam eos laudantium itaque ducimus libero minus voluptatem aliquid nisi explicabo voluptates nesciunt iste vero, numquam quasi quam fuga? Earum, officiis iure. Saepe enim quidem doloremque, inventore, magni culpa natus quia quisquam doloribus autem itaque laboriosam adipisci ratione possimus laborum sunt eos nihil eius ducimus nulla esse. Incidunt molestias sequi illo eum, accusamus dolor id quibusdam veniam dolorem ab soluta optio eligendi dicta alias vel, dolorum ullam unde voluptate.</p>
                        </div>
                        <form class="askee-chat__form">
                            <textarea 
                                class="askee-chat__textarea" 
                                name="user_message" 
                                placeholder="Wyślij wiadomość do Askee..."
                                required
                            ></textarea>
                            
                            <button type="submit" class="askee-chat__submit">
                                <?php echo wp_get_attachment_image(5070, "large"); ?>
                            </button>
                        </form>
                    </div>
                    <div class="askee-chat__buttons">
                        <button class="button button--light" data-id="askee-chat-content-meet">Poznaj mnie</button>
                        <button class="button button--light" data-id="askee-chat-content-areas">Obszary wsparcia</button>
                        <button class="button button--light" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</button>
                        <button class="button button--light" data-id="askee-chat-content-terms">Warunki współpracy</button>
                    </div>
                </div>
            </div>
            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right">
                <?php get_template_part("template-parts/sidebar"); ?>
            </div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
