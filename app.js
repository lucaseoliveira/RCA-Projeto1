var path = require('path');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var net = require('net');
var tcpServer = net.createServer();

var expressLayouts = require('express-ejs-layouts')
var session = require('express-session');
var sqliteStore = require('connect-sqlite3')(session);
var logger = require('morgan');


var io = require('socket.io').listen(http);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
var cookieParser = require('cookie-parser');




// banco de dados


var connection = require('express-myconnection');
var mysql = require('mysql');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'remotemysql.com',
  user: 'ahZZp3P8X0',
  password: 'G0VsNwA3tw',
  database: 'ahZZp3P8X0'
});
pool.on('release', () => console.log('pool => conexão retornada'));
/*
app.use(
  connection(mysql, {
    host: 'remotemysql.com'
    , //servidor do banco mysql, se for local: localhost,
    user: 'ahZZp3P8X0'
    , //usuario com permissao de conexao a base de dados
    password: 'G0VsNwA3tw'
    , //senha de acesso ao banco
    port: 3306, //porta do mysql, normalmente 3306
    database: 'ahZZp3P8X0' //nome da base de dados (esquema)
  }, 'pool')
);*/

// sessions
app.use(cookieParser());
var sessao = session({
  store: new sqliteStore,
  name: "name",
  secret: "pass",
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  resave: false,
  saveUninitialized: false
})

app.use(sessao);



listArduinos = [];

/*----------------------------------------------------------------
                      Engine Setup
----------------------------------------------------------------*/


app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {

  console.log(req.session.arduino);
  if (req.session.logado) {
    if (!req.session.arduino) {
      pool.getConnection(function (err, connection) {
        connection.query("SELECT codigoArduino, descricao FROM usuario, arduinos WHERE arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? ", [req.session.idUsuario], function (err, rows) {
          if (err) {
            connection.release();
            res.json({ status: 'ERRO', data: + err });
          }
          else {

            //console.log("linha", rows);
            connection.release();
            res.render('arduino', { dados: rows });
          }

        });
      });

    }
    else {
      pool.getConnection(function (err, connection) {
        connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
          if (err) {
            connection.release();
            res.json({ status: 'ERRO', data: + err });
          }
          else if (rows[0] === undefined) {
            dados = {
              id: req.session.arduino,
              nome: "?",
              temperatura: "vazio",
              luminosidade: "vazio",
              notificacao: ''
            }
            connection.release();
            res.render('index', { dados: dados });
          }
          else {
            dadosAux = {
              id: rows[0].codigoArduino,
              nome: rows[0].nome,
              temperatura: rows[0].medidaTemp,
              luminosidade: rows[0].medidaLumino

            }
            connection.release();
            pool.getConnection(function (err, connection) {
              connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
                if (err) {
                  connection.release();
                  res.json({ status: 'ERRO', data: + err });
                }
                else {
                  //console.log(rows);
                  connection.release();
                  dados = {
                    id: dadosAux.id,
                    nome: dadosAux.nome,
                    temperatura: dadosAux.temperatura,
                    luminosidade: dadosAux.luminosidade,
                    notificacao: rows

                  }

                  res.render('index', { dados: dados });
                }

              });
            });
          }

        });
      });

    }
  }
  else {
    res.render('login');
  }

});


app.get('/deslogar', function (req, res) {
  req.session.destroy(function (err) {
    if (err)
      res.json({ status: 'ERRO', data: + err });
    else
      res.json({ status: 'OK', data: 'Logout com sucesso!' });
  });

});


app.get('/plantas', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else if (rows[0] === undefined) {
        dados = {
          nome: "?",
          temperatura: "vazio",
          luminosidade: "vazio",
          notificacao: ''
        }
        connection.release();
        res.render('plantas', { dados: dados });
      }
      else {
        dadosAux = {
          id: rows[0].codigoArduino,
          nome: rows[0].nome,

        }
        connection.release();
        pool.getConnection(function (err, connection) {
          connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
            if (err) {
              connection.release();
              res.json({ status: 'ERRO', data: + err });
            }
            else {
              //console.log(rows);
              connection.release();
              dados = {
                id: dadosAux.id,
                nome: dadosAux.nome,
                notificacao: rows

              }

              res.render('plantas', { dados: dados });
            }

          });
        });
      }

    });
  });
  

});

app.get('/gerais', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else if (rows[0] === undefined) {
        dados = {
          id: req.session.arduino,
              nome: "?",
              temperatura: "vazio",
              luminosidade: "vazio",
              notificacao: ''
        }
        connection.release();
        res.render('gerais', { dados: dados });
      }
      else {
        dadosAux = {
          id: rows[0].codigoArduino,
          nome: rows[0].nome,

        }
        connection.release();
        pool.getConnection(function (err, connection) {
          connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
            if (err) {
              connection.release();
              res.json({ status: 'ERRO', data: + err });
            }
            else {
              //console.log(rows);
              connection.release();
              dados = {
                id: dadosAux.id,
                nome: dadosAux.nome,
                notificacao: rows

              }

              res.render('gerais', { dados: dados });
            }

          });
        });
      }

    });
  });
  

});


app.get('/temperatura', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else if (rows[0] === undefined) {
        dados = {
          id: req.session.arduino,
          nome: "?",
          temperatura: "vazio",
          luminosidade: "vazio",
          notificacao: ''
        }
        connection.release();
        res.render('temperatura', { dados: dados });
      }
      else {
        dadosAux = {
          id: rows[0].codigoArduino,
          nome: rows[0].nome,

        }
        connection.release();
        pool.getConnection(function (err, connection) {
          connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
            if (err) {
              connection.release();
              res.json({ status: 'ERRO', data: + err });
            }
            else {
              //console.log(rows);
              connection.release();
              dados = {
                id: dadosAux.id,
                nome: dadosAux.nome,
                notificacao: rows

              }

              res.render('temperatura', { dados: dados });
            }

          });
        });
      }

    });
  });
  

});




app.get('/luminosidade', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else if (rows[0] === undefined) {
        dados = {
          id: req.session.arduino,
          nome: "?",
          temperatura: "vazio",
          luminosidade: "vazio",
          notificacao: ''
        }
        connection.release();
        res.render('luminosidade', { dados: dados });
      }
      else {
        dadosAux = {
          id: rows[0].codigoArduino,
          nome: rows[0].nome,

        }
        connection.release();
        pool.getConnection(function (err, connection) {
          connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
            if (err) {
              connection.release();
              res.json({ status: 'ERRO', data: + err });
            }
            else {
              //console.log(rows);
              connection.release();
              dados = {
                id: dadosAux.id,
                nome: dadosAux.nome,
                notificacao: rows

              }

              res.render('luminosidade', { dados: dados });
            }

          });
        });
      }

    });
  });
});


app.get('/alimentacao', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario, arduinos, medidas WHERE arduinos.codigoArduino = medidas.codigoArduino AND arduinos.codigoUsuario = usuario.codigoUsuario AND usuario.codigoUsuario = ? AND arduinos.codigoArduino = ?  ORDER BY medidas.data DESC ", [req.session.idUsuario, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else if (rows[0] === undefined) {
        dados = {
          id: req.session.arduino,
              nome: "?",
              temperatura: "vazio",
              luminosidade: "vazio",
              notificacao: ''
        }
        connection.release();
        res.render('alimentacao', { dados: dados });
      }
      else {
        dadosAux = {
          id: rows[0].codigoArduino,
          nome: rows[0].nome,

        }
        connection.release();
        pool.getConnection(function (err, connection) {
          connection.query("SELECT * FROM `notificacao` WHERE `idArduino` = ? AND `lido` = 0 ORDER BY `data` DESC", [req.session.arduino], function (err, rows) {
            if (err) {
              connection.release();
              res.json({ status: 'ERRO', data: + err });
            }
            else {
              //console.log(rows);
              connection.release();
              dados = {
                id: dadosAux.id,
                nome: dadosAux.nome,
                notificacao: rows

              }

              res.render('alimentacao', { dados: dados });
            }

          });
        });
      }

    });
  });
  

});



app.get('/notificaLido', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("UPDATE `notificacao` SET `lido` = 1 WHERE `idArduino` = ?", [req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: "OK" });
      }

    });
  });
});

app.get('/horariosGet', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM `horarios` WHERE `idArduino` = ? ", [req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: rows });
      }

    });
  });
});

app.post('/apagarHorario', function (req, res) {
  var input = req.body;
  console.log("merda")
  pool.getConnection(function (err, connection) {
    connection.query("DELETE FROM `horarios` WHERE `idHorario` = ?", [input.id], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: "Horario Apagado" });
      }

    });
  });
});

app.post('/setarPlantar', function (req, res) {
  var input = req.body;

  pool.getConnection(function (err, connection) {
    connection.query("UPDATE `arduinos` SET `planta` = ? WHERE `codigoArduino`= ?", [input.planta,req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: "Planta Cadastrada" });
      }

    });
  });
});

app.post('/novoAqua', function (req, res) {
  var input = req.body;

  pool.getConnection(function (err, connection) {
    connection.query("INSERT INTO `arduinos`( `codigoUsuario`,  `descricao`, `litragem`) VALUES (?,?,?)", [ req.session.idUsuario, input.descricao, input.litros], function (err, rows) {
      if (err) {
        connection.release();
        console.log(err);
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: "Aquario Cadastrada" });
      }

    });
  });
});



app.post('/setarHorarioLumino', function (req, res) {
  console.log("merda", req.session.arduino, listArduinos.length);


  var input = req.body;


  pool.getConnection(function (err, connection) {
    connection.query("INSERT INTO `horariosLumino`(`idArduino`, `inicio`, `fim`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE `inicio` = ?, `fim` = ?", [req.session.arduino,input.inicio ,input.fim,input.inicio ,input.fim], function (err, rows) {
      if (err) {
        connection.release();
        console.log(err)
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        //console.log("linha", rows);
        connection.release();
        res.json({ status: 'OK', data: "Luminosidade Cadastrada" });
      }

    });
  });



 
  

});




app.post('/setarTempMedia', function (req, res) {
 
  var input = req.body;


  pool.getConnection(function (err, connection) {
    connection.query("UPDATE `arduinos` SET `tempMedia`= ? WHERE `codigoArduino` = ?", [input.temp, req.session.arduino], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {
        connection.release();

        for (i = 0; i < listArduinos.length; i++) {
          console.log(listArduinos[i].id);
          if (listArduinos[i].id == req.session.arduino) {
            console.log("vou mandar pro", listArduinos[i].id);

            listArduinos[i].socket.write("temperatura:" + input.temp + '\n');
          }
        }


        res.json({
          status: 'OK', data: 'Temperatura Cadastrada!'
        });

      }
    });
  });
});




app.post('/login', function (req, res, next) {
  var input = req.body;
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM usuario WHERE user = ? AND pass = ?", [input.usuario, input.senha], function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {
        if (rows[0] === undefined) {
          connection.release();
          res.json({
            status: 'ERRO',
            data: 'Dados de login incorretos!'
          });
        }
        else {
          req.session.logado = true;
          req.session.idUsuario = rows[0].codigoUsuario;
          connection.release();
          res.json({
            status: 'OK', data: 'Logado com sucesso!'
          });
        }
      }
    });
  });
});

app.post('/definirArduino', function (req, res) {
  var input = req.body;

  req.session.arduino = input.id;
  res.json({
    status: 'OK', data: 'Logado com sucesso!'
  });

});

app.get('/medidas', function (req, res) {
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM `medidas` WHERE `codigoArduino` = ? ORDER BY `data` DESC LIMIT 8", req.session.arduino, function (err, rows) {
      if (err) {
        connection.release();
        res.json({ status: 'ERRO', data: + err });
      }
      else {

        connection.release();
        res.json({
          status: 'OK', data: rows
        });

      }
    });
  });
});


app.get('/trocarAquario', function (req, res) {
  req.session.arduino = undefined;
  res.json({
    status: 'OK', data: 'Logado com sucesso!'
  });
});



app.post('/cadastrarHora', function (req, res) {
  console.log(req.session.idUsuario);
  if (req.session.logado) {
    var input = req.body;
    console.log(input.horario);
    pool.getConnection(function (err, connection) {
      connection.query("INSERT INTO `horarios`(`horario`, `idArduino`) VALUES (?, ?)", [input.horario, req.session.arduino ], function (err, rows) {
        if (err) {
          console.log(err);
          connection.release();
          res.json({ status: 'ERRO', data: + err });
        }
        else {

          console.log("linha", rows[0]);
          connection.release();
          res.json({ status: 'OK', data: "ok" });
        }

      });
    });

  }
  else {
    res.render('login');
  }

});

var server = http.listen(3000);
console.log('Servidor Express iniciado na porta %s', server.address().port);

var clienteSocket = -1;

// Socket Web

listCliente = [];

io.use(function(socket, next) {
  sessao(socket.request, socket.request.res, next);
});



io.on('connection', function (socket) {

 console.log( socket.request.session.arduino);
 auxCliente={
   id:socket.id,
   idArduino:socket.request.session.arduino
 }
 listCliente.push(auxCliente);


  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });

  socket.on('private message', function (from, msg) {
    console.log('I received a private message by ', from, ' saying ', msg);
  });
  socket.on('disconnect', () => {
    console.log("desconect", listCliente.length);
    listCliente.pop(auxCliente)
  });

});



// arduino conectado
// Arduino conecta no socket.
tcpServer.on('connection', function (socket) {

  // Avisa ao nodejs, que um arduino está conectado.
  tcpServer.getConnections(function (err, count) {
    console.log("Connections: " + count);
  });

  // Avisa próprio arduino, que ele foi conectado.



  // Evento de recebimento de mensagem do arduino o nodejs.
  socket.on('data', function (data) {
    // send {"tipo": "medida", "id":1, "temperatura": 28, "lumino": 1260}
    // Avisa ao nodejs, que o arduino mandou uma mensagem.
    console.log('NodeJS - Mensagem recebida: ' + data + '.');
    dataJSON = JSON.parse(data);
    console.log("json eh", dataJSON);




    if (dataJSON.tipo == "autenticar") {
      console.log(dataJSON.id, ": SE AUTENTICOOOOOOOOOOOU");
      // Adiciona o arduino na lista de arduinos.
      socketAux = {
        socket: socket,
        id: dataJSON.id
      }
      listArduinos.push(socketAux);
      //console.log("list eh", listArduinos)
      pool.getConnection(function (err, connection) {
        connection.query("SELECT * FROM `arduinos` WHERE `codigoArduino` = ?",dataJSON.id, function (err, rows) {
          if (err) {
            console.log(err)
            connection.release();
          }
          else {
            console.log("voltou", rows[0].tempMedia);
            socket.write("temperatura:" + rows[0].tempMedia +'\n');
            connection.release();
          }
    
        });
      });
    }
    else if (dataJSON.tipo == "medida") {
      console.log(dataJSON.id, ": MEDIU A TEMPERATURA ", dataJSON.temperatura, "E LUMINO ", dataJSON.lumino, "E ESTADO ", dataJSON.estado);
      medidas = {
        id: dataJSON.id,
        temperatura: dataJSON.temperatura,
        luminosidade: dataJSON.lumino,
        estado: dataJSON.estado
      }
      console.log(medidas);

      pool.getConnection(function (err, connection) {
        connection.query("SELECT * FROM `arduinos`,`tabelaPlantas` WHERE `codigoArduino` = ? AND `planta` = `idPlanta`", [medidas.id], function (err, rows) {
          if (err) {
            console.log(err)
            connection.release();
          }
          else {
            connection.release();
            if(medidas.luminosidade  > (rows[0].luminosidade + 20) || medidas.luminosidade  < (rows[0].luminosidade - 20)){
              console.log("alerta");
              pool.getConnection(function (err, connection) {
                connection.query("INSERT INTO `notificacao`(`idArduino`, `idMedida`, `lido`, `tipoNotificacao`, `descricao`) VALUES (?,0,0,'Medida','Fora do intervalo')", [medidas.id], function (err, rows) {
                  if (err) {
                    console.log(err)
                    connection.release();
                  }
                  else {
                    connection.release();
                  }
        
                });
              });
            }
            else{
              console.log("nao alerta")
            }
            
            
          }

        });
      });




      pool.getConnection(function (err, connection) {
        now = new Date;
        connection.query("INSERT INTO `medidas`(`codigoArduino`, `medidaTemp`, `medidaLumino`, `data`) VALUES (?,?,?,?)", [medidas.id, medidas.temperatura, medidas.luminosidade, now.toLocaleString()], function (err, rows) {
          if (err) {
            console.log(err)
            connection.release();
          }
          else {
            connection.release();

            medidasDados = {
              id: dataJSON.id,
              temperatura: dataJSON.temperatura,
              luminosidade: dataJSON.lumino

            }

            for(i=0;i<listCliente.length;i++){
              console.log("verificando", listCliente[i].idArduino, medidasDados.id)
              if(listCliente[i].idArduino == medidasDados.id){
                console.log("vou mandar")
                io.sockets.connected[listCliente[i].id].emit("medidas", medidasDados);

              }
              
            }
            
          }

        });
      });
    }



  })

  // Evento quando cliente sair
  socket.on('close', function (data) {


  })
});


setInterval(function () {
  console.log("vou verificar hroa da comida")
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM `horarios`", function (err, rows) {
      if (err) {
        console.log(err);
        connection.release();

      }
      else {
        now = new Date;

        //console.log("linha", rows, now


        for (i = 0; i < rows.length; i++) {
          if (Date.parse('01/01/2011 ' + rows[i].horario) == Date.parse('01/01/2011 ' + now.getHours() + ":" + now.getMinutes() + ":00")) {


        
            for (j = 0; j < listArduinos.length; j++) {
              console.log(listArduinos[j].id);
              if (listArduinos[j].id == rows[i].idArduino) {
                console.log("vou mandar pro", listArduinos[j].id, listArduinos.length);

                listArduinos[j].socket.write("alimentar:" + 1 + '\n');
              }
            }


            console.log("VOU ALIMENTAR", Date.parse('01/01/2011 ' + rows[i].horario), Date.parse('01/01/2011 ' + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()))
          }

        }

        connection.release();

      }

    });
  });
}, 60000);



setInterval(function () {
  console.log("vou verificar hora da luminosidade")
  pool.getConnection(function (err, connection) {
    connection.query("SELECT * FROM `horariosLumino`", function (err, rows) {
      if (err) {
        console.log(err);
        connection.release();

      }
      else {
        now = new Date;

        console.log("linha", rows, now);



        for (i = 0; i < rows.length; i++) {
          if (Date.parse('01/01/2011 ' + rows[i].inicio) == Date.parse('01/01/2011 ' + now.getHours() + ":" + now.getMinutes() + ":00")) {
            for (j = 0; j < listArduinos.length; j++) {
              console.log(listArduinos[j].id);
              if (listArduinos[j].id == rows[i].idArduino) {
                console.log("vou mandar pro", listArduinos[j].id);

                listArduinos[j].socket.write("acender:" + 1 + '\n');
              }
            }


            console.log("VOU ACENDER")
          }
          else if (Date.parse('01/01/2011 ' + rows[i].fim) == Date.parse('01/01/2011 ' + now.getHours() + ":" + now.getMinutes() + ":00")) {
            for (j = 0; j < listArduinos.length; j++) {
              console.log(listArduinos[j].id);
              if (listArduinos[j].id == rows[i].idArduino) {
                console.log("vou mandar pro", listArduinos[j].id);

                listArduinos[j].socket.write("acender:" + 0 + '\n');
              }
            }


            console.log("VOU APAGAR")
          }

        }

        connection.release();

      }

    });
  });
}, 60000);





// listen

tcpServer.listen(1337, function () {
  console.log('Socket está na porta: 1337.');
});



module.exports = app;