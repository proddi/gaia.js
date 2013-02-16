# configure rewrite for lighttpd
    url.rewrite-once            = ( ".*\.(js|ico|gif|jpg|png|css)$"        => "$0",     # pass through resources
                                    "^/(.*)/examples/apiexplorer/.*.html"  => "$0",     # pass through ajax
                                    "^/(.*)/examples/apiexplorer/"         => "/$1/examples/apiexplorer/" )

