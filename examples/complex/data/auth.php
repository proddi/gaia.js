<?php

    session_start();
    $data = array();

    switch ($_POST['action']) {
        // login action
        case 'login':
            $user = $_POST['user'];
            $pass = $_POST['pass'];

            $data = array(
                'user' => array(
                    'id' => 23,
                    'name' => 'proddi-' . $user,
                    'image' => 'http://media.steampowered.com/steamcommunity/public/images/avatars/00/0000b1a382e2f266bf1164411c3e4c4c593aa4a7_full.jpg'
                ),
                'resume_id' => 'some_id_the_server_recognizes_the user',
                'session_id' => session_id()
            );
            $_SESSION['user'] = $data['user'];
            break;

        // logout action
        case 'logout':
            session_destroy();
            break;

        // probe action
        default:
            $data = array(
                'user' => $_SESSION['user'],
                'session_id' => session_id()
            );
    }


    header('Content-type: application/json');

    try {
        echo json_encode($data);
    } catch(Exception $e) {
        echo json_encode(array('error' => $e->getMessage()));
    }

?>