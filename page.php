<?php

get_header();
the_post();

$url = "http://" . $_SERVER["SERVER_NAME"] . $_SERVER["REQUEST_URI"];

?>

<?php get_footer(); ?>
