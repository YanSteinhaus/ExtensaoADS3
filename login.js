const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();

app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({storage: storage});
app.use('/uploads', express.static('uploads'));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root99',
    database: 'controle_estoque'
});

connection.connect(function(err) {
    if (err) {
        console.error('Erro ', err);
        return;
    }
    console.log("Conexão ok");
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get("/home", function(req, res) {
    res.sendFile(__dirname + "/public/html/home.html");
});

app.post('/login', function(req, res) {
    const username = req.body.login;
    const password = req.body.senha;

    connection.query('SELECT * FROM usuario WHERE email = ? AND senha = ?', [username, password], function(error, results, fields) {
        if (error) {
            console.error('Erro ao executar a consulta: ', error);
            res.status(500).send('Erro interno ao verificar credenciais.');
            return;
        }

        if (results.length > 0) {
            res.redirect('/home');
        } else {
            res.render('login', { errorMessage: 'Credenciais inválidas.', username: username });
            return;
        }
    });
});

app.post('/alterar-senha', function(req, res) {
    const email = req.body.email;
    const novaSenha = req.body.novaSenha;

    connection.query('UPDATE usuario SET senha = ? WHERE email = ?', [novaSenha, email], function(error, results, fields) {
        if (error) {
            console.error('Erro ao alterar a senha: ', error);
            res.status(500).send('Erro interno ao alterar a senha.');
            return;
        }

        if (results.affectedRows > 0) {
            res.status(200).send('Senha alterada com sucesso.');
        } else {
            res.status(404).send('Usuário não encontrado.');
        }
    });
});

app.post('/cadastrar', upload.fields([{ name: 'imagem_produto', maxCount: 1 }, { name: 'arquivo_zip', maxCount: 1 }]), function(req, res) {
    const descricao = req.body.descricao;
    const quantidade = req.body.quantidade;
    const valorunitario = req.body.valorunitario;
    const imagem_produto = req.files.imagem_produto ? req.files.imagem_produto[0].filename : null;
    const arquivo_zip = req.files.arquivo_zip ? req.files.arquivo_zip[0].filename : null;

    const values = [descricao, quantidade, valorunitario, imagem_produto, arquivo_zip];
    const insert = "INSERT INTO produtos(descricao, quantidade_estoque, valor_unitario, imagem_produto, arquivo_zip) VALUES (?, ?, ?, ?, ?)";

    connection.query(insert, values, function(err, result) {
        if (!err) {
            console.log("Dados inseridos com sucesso!");
            res.redirect('/listar');
        } else {
            console.log("Não foi possível inserir os dados: ", err);
            res.send("Erro!");
        }
    });
});

app.get('/listar', function(req, res) {
    const listar = "SELECT * FROM produtos";

    connection.query(listar, function(err, rows) {
        if (!err) {
            console.log("Consulta realizada com sucesso!");
            res.send(`
            <html>
                <head>
                    <title>Relatório de estoque</title>
                    <link rel="stylesheet" href="jstyle.css">

                    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
                   
                </head>
                <body>
                  
                  <header class="cabeco">
                    <h1 class="nomeCabeco">Indie</h1>
                    <div class="logo"><img src="images/IndieHitLogo.png" style="width: 80px; height: 80px"></div>

                    <div class="searchbar"> <i class='bx bx-search-alt-2 bxs'></i> <input class="sb" type="text"></div>
                  </header>   
                      <div class="catalog">  
                        ${rows.map(row => `

                        
                          
                        <div class="container">
                            
                            <div class="imagem"><img src="/uploads/${row.imagem_produto}" style="width: 300px; height: 240px"></div>
                            <div class="td">${row.id}</div>
                            <div class="containerNome"><div class="nome">${row.descricao}</div></div>
                            <div class="containerPreco"><div class="preco">R$ ${row.valor_unitario}</div></div>
                            <div class="quantidade td">${row.quantidade_estoque}</div>
                            
                            
                            <div class="linkens">${row.arquivo_zip ? `<a class="liloks" href="/uploads/${row.arquivo_zip}" download><i class='bx bxs-download lilostitch'></i></a>` : 'N/A'}
                            
                                <a class="liloks" href="/editar/${row.id}"><i class='bx bxs-edit-alt lilostitch'></i></a> 
                                <a class="liloks" href="/excluir/${row.id}"><i class='bx bx-trash lilostitch' ></i></a> 
                            </div>
                        </div>
                      
                        `).join('')}
                      </div>
                </body>
            </html>
            `);
        } else {
            console.log("Erro no relatório de estoque", err);
            res.send("Erro");
        }
    });
});

app.get('/excluir/:id', function(req, res) {
    const id = req.params.id;
    const excluir = "DELETE FROM produtos WHERE id = ?";

    connection.query(excluir, [id], function(err, result) {
        if (!err) {
            console.log("Produto deletado!");
            res.redirect('/listar');
        } else {
            console.log("Erro ao deletar produto", err);
        }
    });
});

app.get('/editar/:id', function(req, res) {
    const id = req.params.id;

    connection.query('SELECT * FROM produtos WHERE id = ?', [id], function(err, results) {
        if (err) {
            console.error('Erro ao buscar produto por ID', err);
            res.status(500).send('Erro interno ao buscar produto');
            return;
        }
        if (results.length === 0) {
            console.log("Produto não encontrado");
            res.status(404).send("Produto não encontrado");
            return;
        }

        const produto = results[0];

        res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width-device-width, initial-scale=1.0">
            <title>Editar produto</title>
            <link rel="stylesheet" href="styles.css">
        </head>
        <body>
            <h1>Editar produto</h1>
            <form action="/editar/${id}" method="POST" enctype="multipart/form-data">
                <label for="novaDescricao">Descrição:</label>
                <input type="text" id="novaDescricao" name="novaDescricao" value="${produto.descricao}">
                <label for="quantidade">Quantidade em Estoque:</label>
                <input type="text" id="novaQuantidade" name="novaQuantidade" value="${produto.quantidade_estoque}"><br>
                <label for="valor">Valor unitário:</label>
                <input type="text" id="novoValorUnitario" name="novoValorUnitario" value="${produto.valor_unitario}"><br>
                <label for="imagemProduto">Imagem produto:</label>
                <img src="/uploads/${produto.imagem_produto}" alt="Imagem do produto" style="width: 100px;"><br>
                <label for="novaImagem">Nova Imagem</label>
                <input type="file" id="novaImagem" name="novaImagem"><br>
                <label for="novoArquivoZip">Novo Arquivo ZIP</label>
                <input type="file" id="novoArquivoZip" name="novoArquivoZip"><br>
                <button type="submit">Salvar</button>
            </form>
        </body>
        </html>`);
    });
});

app.post('/editar/:id', upload.fields([{ name: 'novaImagem', maxCount: 1 }, { name: 'novoArquivoZip', maxCount: 1 }]), function(req, res) {
    const id = req.params.id;
    const novaDescricao = req.body.novaDescricao;
    const novaQuantidade = req.body.novaQuantidade;
    const novoValorUnitario = req.body.novoValorUnitario;
    const novaImagem = req.files.novaImagem ? req.files.novaImagem[0].filename : null;
    const novoArquivoZip = req.files.novoArquivoZip ? req.files.novoArquivoZip[0].filename : null;

    const query = 'UPDATE produtos SET descricao = ?, quantidade_estoque = ?, valor_unitario = ?' + (novaImagem ? ', imagem_produto = ?' : '') + (novoArquivoZip ? ', arquivo_zip = ?' : '') + ' WHERE id = ?';
    const values = [novaDescricao, novaQuantidade, novoValorUnitario].concat(novaImagem ? [novaImagem] : []).concat(novoArquivoZip ? [novoArquivoZip, id] : [id]);

    connection.query(query, values, function(err, result) {
        if (err) {
            console.error('Erro ao atualizar produto', err);
            res.status(500).send('Erro interno ao atualizar produto');
            return;
        }
        if (result.affectedRows === 0) {
            console.log('Produto não encontrado');
            res.status(404).send('Produto não encontrado');
            return;
        }
        console.log("Produto atualizado com sucesso!");
        res.redirect('/listar');
    });
});

app.listen(8083, function() {
    console.log("Servidor rodando na url http://localhost:8083");
});
