# SOLAR ENERGY CALCULATOR - Guia de Inicio Rápido

## 🚀 Início Rápido (5 minutos)

### 1. Clonar o Repositório

```bash
git clone https://github.com/fariaemti/solar-energy-calculator.git
cd solar-energy-calculator
```

### 2. Criar Pasta de Dados

```bash
mkdir -p data
chmod 755 data
```

### 3. Iniciar o Servidor

#### Opção A: PHP Built-in (Recomendado para Desenvolvimento)

```bash
php -S localhost:8000
```

#### Opção B: Apache com mod_rewrite

Certifique-se que o `.htaccess` está ativado:

```apache
a2enmod rewrite
systemctl restart apache2
```

### 4. Acessar a Aplicação

Abra seu navegador em:

```
http://localhost:8000
```

---

## 📋 Checklist de Configuração

- [ ] Repositório clonado
- [ ] Pasta `data/` criada
- [ ] Permissões corretas (755 para data/)
- [ ] Servidor PHP rodando
- [ ] Página carrega no navegador
- [ ] Formulário funciona
- [ ] Cálculos aparecem

---

## 🧪 Testando a Aplicação

### 1. Teste Básico

1. Preencha o formulário com:
   - Consumo Mensal: 300 kWh
   - Tarifa: 0.85 R$/kWh
   - Região: Sudeste
   - Área Disponível: 40 m²

2. Clique em "Calcular Economia"

3. Verifique se os resultados aparecem

### 2. Teste do Banco de Dados

Acesse em seu navegador:

```
http://localhost:8000/process.php?rota=verificar-banco
```

Você deve ver:

```json
{
  "sucesso": true,
  "banco_existe": true,
  "tamanho_bytes": 12288,
  ...
}
```

### 3. Teste de Salvamento

1. Após calcular, clique em "Salvar Cálculo"
2. Vá para "Histórico"
3. Seu cálculo deve aparecer na lista

---

## 🐛 Solução de Problemas Comuns

### Erro: "Não foi possível conectar ao servidor"

**Causa**: Servidor PHP não está rodando

**Solução**:
```bash
php -S localhost:8000
```

### Erro: "Diretório 'data' não existe"

**Causa**: Pasta não foi criada

**Solução**:
```bash
mkdir -p data
chmod 755 data
```

### Erro: "Permissão negada"

**Causa**: Permissões de arquivo/diretório

**Solução**:
```bash
chmod 755 data
chmod 644 *.php *.html *.css *.js
```

### Gráficos não aparecem

**Causa**: Chart.js não carregou

**Solução**: Verifique sua conexão com internet (CDN externo)

### Cálculos não salvam

**Causa**: Banco de dados não inicializado

**Solução**: Delete `data/calculos.db` e recarregue a página

---

## 📱 Acessar em Outro Dispositivo

Se quiser acessar de outro computador/smartphone na mesma rede:

### 1. Descobrir seu IP local

**Linux/Mac**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows**:
```cmd
ipconfig
```

### 2. Acessar via IP

```
http://192.168.1.100:8000
```

---

## 🔧 Configuração Avançada

### Variáveis de Ambiente (Futuro)

Crie um arquivo `.env`:

```env
DB_PATH=data/calculos.db
API_URL=http://localhost:8000
ENVIRONMENT=development
DEBUG=true
```

### Alterar Porta

```bash
php -S localhost:9000
```

### Usar Apache Virtual Host

Edite `/etc/apache2/sites-available/solar.conf`:

```apache
<VirtualHost *:80>
    ServerName solar.local
    DocumentRoot /var/www/html/solar-energy-calculator
    
    <Directory /var/www/html/solar-energy-calculator>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Enable o site:
```bash
a2ensite solar
systemctl restart apache2
```

Adicione ao `/etc/hosts`:
```
127.0.0.1 solar.local
```

Acesse: `http://solar.local`

---

## 🚀 Deploy em Produção

### Checklist

- [ ] Remover arquivos de desenvolvimento
- [ ] Configurar HTTPS/SSL
- [ ] Aumentar limite de upload
- [ ] Configurar backups automáticos
- [ ] Adicionar rate limiting
- [ ] Monitorar logs
- [ ] Otimizar performance

### Passos

1. **Fazer upload dos arquivos** para servidor

```bash
scp -r . user@servidor.com:/var/www/html/solar
```

2. **Configurar permissões**

```bash
chmod 755 data/
chmod 644 *.php *.html *.css *.js
```

3. **Habilitar SSL**

```bash
certbot certonly --standalone -d seu-dominio.com
```

4. **Configurar cron para backup**

```bash
0 2 * * * /usr/local/bin/backup-solar.sh
```

---

## 📊 Usando a Aplicação

### Fluxo Básico

1. **Preencher formulário** com dados da sua residência
2. **Clicar "Calcular"** para ver os resultados
3. **Analisar gráficos** com as projeções
4. **Salvar cálculo** no banco de dados
5. **Exportar PDF/CSV** para compartilhar
6. **Consultar histórico** para comparar cálculos

### Campos do Formulário

| Campo | Exemplo | Notas |
|-------|---------|-------|
| Consumo Mensal | 300 | Ver na conta de luz |
| Tarifa | 0.85 | Tarifa média estadual |
| Pessoas | 4 | Inclua você mesmo |
| Tipo | Casa | Apartamento/Casa/Comercial |
| Área | 40 | Telhado disponível em m² |
| Região | Sudeste | Afeta irradiação solar |
| Custo Painel | 2000 | Incluindo instalação |
| Anos | 25 | Vida útil dos painéis |

---

## 💡 Dicas Úteis

### 1. Modo Escuro

Clique no ícone da lua (🌙) no canto superior direito para alternar tema.

### 2. Histórico Local

Seus cálculos ficam salvos no navegador automaticamente (LocalStorage).

### 3. Compartilhar Resultados

Use o botão "Compartilhar" para enviar para WhatsApp, Facebook, etc.

### 4. Exportar para Excel

Exporte em CSV e abra em Excel/Google Sheets para análises avançadas.

### 5. Comparar Cálculos

Salve vários cenários (diferentes regiões, tamanhos, etc.) e compare no histórico.

---

## 📞 Suporte

### Documentação Completa

Veja `README.md` para documentação completa com:
- Arquitetura do projeto
- API REST endpoints
- Fórmulas de cálculo
- Referências técnicas

### Relatar Problemas

Abra uma issue no GitHub:
```
https://github.com/fariaemti/solar-energy-calculator/issues
```

### Contribuir

Faça um fork e envie pull requests com melhorias!

---

## 📚 Recursos Adicionais

### Dados de Irradiação Solar

- [INPE - Mapa de Irradiação](http://www.dse.inpe.br/)
- [PVGIS - Photovoltaic Geographical Information System](https://pvgis.com/)

### Tarifas de Energia

- [ANEEL - Tabela de Tarifas](https://www.aneel.gov.br/)
- [Acesse sua distribuidora](https://www.aneel.gov.br/distribuicao)

### Custos de Painéis

- [Pricespy Brasil](https://www.pricespy.com.br/)
- [Mercado Livre](https://www.mercadolivre.com.br/)

---

## 🎓 Aprendendo Mais

Este projeto demonstra:

- **Frontend Moderno**: HTML5, CSS3, JavaScript Vanilla
- **Backend Seguro**: PHP com PDO e prepared statements
- **Banco de Dados**: SQLite com operações CRUD
- **API REST**: Endpoints bem estruturados
- **UX/UI**: Design responsivo e intuitivo
- **Cálculos Complexos**: Simulações anuais com degradação

Use como referência para seus próprios projetos!

---

## ✅ Próximos Passos

1. **Explorar o código** para entender a lógica
2. **Testar diferentes cenários** de economia
3. **Personalizar cores e textos** conforme necessário
4. **Adicionar mais regiões** de irradiação solar
5. **Expandir funcionalidades** (login, relatórios, etc.)

---

**Diversão garantida! 🌞⚡**

Última atualização: Setembro 2024
