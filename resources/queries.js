export const CONSTRUCT_QUERY =
    'CONSTRUCT { ?s ?p ?o }\
    WHERE {\
        { BIND(<{resource}> AS ?s) ?s ?p ?o . } UNION \
        { BIND(<{resource}> AS ?p) ?s ?p ?o . } UNION \
        { BIND(<{resource}> AS ?o) ?s ?p ?o . }\
    } LIMIT 100';