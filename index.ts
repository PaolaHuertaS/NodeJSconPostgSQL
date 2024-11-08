const fs = require('fs');
const pg = require('pg');
const url = require('url');

const config = {
    user: "avnadmin",
    password: "AVNS_45IjXrwFDcUCLByHI_v",
    host: "pg-261f372e-paonico11-a758.l.aivencloud.com",
    port: 23584,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: `-----BEGIN CERTIFICATE-----
MIIEQTCCAqmgAwIBAgIUYYuKUi4Lxp2+9oB9n3n6adnOuRIwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvZTA3OGNhYjUtYjZjNi00ODE0LWE1MWQtNzIxMDc2NjVk
MWNmIFByb2plY3QgQ0EwHhcNMjQxMTA4MjAxMzM0WhcNMzQxMTA2MjAxMzM0WjA6
MTgwNgYDVQQDDC9lMDc4Y2FiNS1iNmM2LTQ4MTQtYTUxZC03MjEwNzY2NWQxY2Yg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBALEbh0n1
ba4k05CkfIPHPUtjnUK5paB93pbZDmWL828UyPUv35V9cjQVaTddC34IIj0BcZXO
Po5LZ7nucSlvmTtislHLcpiaKTSBoC/QR+qJKhqnr/s8xt3NLXbkm5HHrDLDiPht
KkOcQoXXPeOSb9QgVABOsZspHkxr9ZjYUju9y9eZ5TviPh/hsbvjI4PMdiVYac3u
gJVt2zVQPqzxY+G43kdJwRo7dZyo4D8xibV+RsV7s9eWpxqgAbZyaTtezDzWTcXq
whR9gocb59NuvsarpX6mexshZPqx+TK2XISxB44y6aaz0OldUQLif70oyKWFb3gI
xwEztAdbF3pWixuP9Lgj4Z/uNz9S/ESV/AaFVLl9juXGJeLvrdBmrbTS71w3VgY3
xRaZX5Onui/N4S2tMdnNg8qXUZnAX3dcPMrH7jVytK/JqpoKfQuk96biNh6wSk+f
jcdEpwZZrhBlIOP4sy8rPp1+vT11xPSXb2T9Cz4Izq12AysRJJ5iAGL2tQIDAQAB
oz8wPTAdBgNVHQ4EFgQUdemuj6BECdvT0vCnrSE/vbYQ6XUwDwYDVR0TBAgwBgEB
/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBACJK9HUXYp5QmNZw
NasCqPrgFwgtW++OXeX5lNn6MuixtjLvFEocSI0NDBB2RZSEtTefaqNRC7Eg/AwN
QPHEfGe1VSyBeSTI4kPz6U6WckBj079if1VQDCiGfEAqjyUXysszXqgN10dl2bc2
o4kFSYgwq8ouE1S4c0SKP2mLS5a3dLcPtiscAZ0iCngtEU/98cUnw8E+1+EIcog1
AN8t5tRf8ReWwyoC7AZuNm4E1TegaFvePNBsagwbYp8nCROJG8rvscwPffH9AfII
nWt7hCtxFqToZRM10JLXwgL/iMFOWEOFhIy7Rvrji4HJV5/Zo5vNEfDmQ4f0ujr7
kSWsLqQvr33HzjBNAyXUVoGgv4Uef8zomM26d3Dsy25zwX08xO8LGzJQmgt4lwBA
Zcg1HRLL0l5zjS9UpOWanxh6/OotBECfM6VmXEyXeb4qPhbAZKNAe6er8lQ5mQ6h
xYiTUx4WeOdRxE6FgIBr3nq+ddsEmGoVsmSj6kmMLElJIvd/aw==
-----END CERTIFICATE-----`,
    },
};

const client = new pg.Client(config);
client.connect(function (err) {
    if (err)
        throw err;
    client.query("SELECT VERSION()", [], function (err, result) {
        if (err)
            throw err;

        console.log(result.rows[0].version);
        client.end(function (err) {
            if (err)
                throw err;
        });
    });
});