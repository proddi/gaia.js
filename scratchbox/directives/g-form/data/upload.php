<?php


    sleep(1);

//    var_dump($_GET);
//    var_dump($_POST);
//    var_dump($_FILES);

    $data = array(
        'files' => array(
        )
    );

    foreach ($_FILES as $name => $file) {
        $data[$name] = array(
            'name' => $file['name'],
            'mimeType' => $file['type'],
            'size' => $file['size'],
            'url' => 'data/files/' . $file['name']
        );
    }
    echo json_encode($data);
?>