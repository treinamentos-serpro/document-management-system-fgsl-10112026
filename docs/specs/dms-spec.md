# Especificação — Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos por uma interface web, com arquivos armazenados no filesystem local e metadados mantidos em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, respeitando a propriedade do documento.
- Interface web para upload, listagem e download.
- Armazenamento dos arquivos em `backend/storage` por padrão, usando Multer com `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do processo.
- Configuração do backend por variáveis de ambiente.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento de documentos.
- Persistência dos metadados em banco de dados.
- Cadastro, autenticação ou gestão completa de contas de usuário.
- Exclusão de documentos, compartilhamento e busca avançada.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo enviado como `multipart/form-data`. |
| RF-02 | O sistema deve rejeitar upload sem arquivo ou sem identificação de usuário. |
| RF-03 | O sistema deve gerar um identificador único e um nome interno de armazenamento que não dependa do nome original. |
| RF-04 | Em caso de upload bem-sucedido, o sistema deve retornar os metadados públicos do documento criado. |
| RF-05 | O sistema deve listar apenas documentos associados ao usuário da requisição. |
| RF-06 | A listagem deve apresentar os documentos do mais recente para o mais antigo. |
| RF-07 | O sistema deve permitir o download pelo identificador somente ao usuário associado ao documento. |
| RF-08 | O sistema deve responder com `404 Not Found` para documento inexistente, de outro usuário ou indisponível no armazenamento. |
| RF-09 | O frontend deve permitir selecionar e enviar um arquivo e informar o resultado da operação. |
| RF-10 | Após um upload bem-sucedido, o frontend deve atualizar a listagem de documentos. |
| RF-11 | O frontend deve permitir iniciar o download de um documento listado e apresentar erros de operação. |
| RF-12 | O endpoint `GET /health` existente deve continuar disponível e retornar o estado do backend. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local com Multer `diskStorage`; provedores externos não são permitidos. |
| RNF-02 | Os metadados devem ser mantidos em memória e podem ser perdidos ao reiniciar o processo. |
| RNF-03 | Arquivos devem usar nomes internos gerados pelo servidor; o nome original não pode ser usado como caminho de armazenamento. |
| RNF-04 | A configuração operacional deve ser feita por variáveis de ambiente, conforme o princípio 12-Factor. |
| RNF-05 | O backend deve respeitar as camadas `routes -> controllers -> services -> repositories`. |
| RNF-06 | As camadas internas não devem depender de Express, de objetos de requisição/resposta HTTP ou de componentes do frontend. |
| RNF-07 | Erros HTTP devem ter formato JSON consistente, exceto a resposta binária de download. |
| RNF-08 | A implementação deve preferir as dependências já presentes no projeto e não deve exigir serviços externos. |
| RNF-09 | Os testes do backend devem usar o runner nativo `node:test`. |

### Configuração proposta

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos enviados. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite inicial proposto de 10 MiB por arquivo. |

O limite padrão é uma decisão inicial para evitar uploads sem limite e pode ser alterado por ambiente.

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único gerado pelo servidor. |
| `originalName` | string | Público | Nome original do arquivo, usado para exibição e nome sugerido no download. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Público | Identificador do usuário associado ao documento. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo no diretório local. |

O repositório em memória deve permitir localizar metadados por `id`. `storageName` nunca é recebido do cliente nem exposto pela API. As respostas públicas incluem somente `id`, `originalName`, `size`, `uploadedAt` e `owner`.

### Identificação do usuário nesta fase

Como autenticação está fora do escopo, as rotas de documentos recebem o header `X-User-Id`, com valor não vazio. O backend usa esse valor para associar uploads e filtrar listagens e downloads. Esse mecanismo é apenas uma convenção para a primeira fase: o cliente pode forjar o header, portanto ele não comprova identidade e não deve ser considerado autenticação adequada para produção.

## 6. Contratos de API

As rotas do backend usam os caminhos indicados nesta seção. No desenvolvimento, o proxy do Vite permite ao frontend chamá-las pelo prefixo `/api` e remove esse prefixo antes de encaminhar as requisições.

Todas as rotas de documentos exigem:

```http
X-User-Id: identificador-do-usuario
```

### Formato de erro

Erros JSON devem seguir este formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Selecione um arquivo para enviar."
  }
}
```

`code` deve ser estável para uso pelo frontend; `message` deve ser apropriada para apresentação ao usuário, sem expor detalhes internos do servidor.

### `POST /upload`

Envia um arquivo para o armazenamento local.

**Entrada**

- `Content-Type: multipart/form-data`
- Campo de arquivo: `file`
- Header obrigatório: `X-User-Id`

**Sucesso — `201 Created`**

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 153600,
  "uploadedAt": "2026-11-10T12:00:00.000Z",
  "owner": "usuario-123"
}
```

**Erros**

- `400 Bad Request`: header de usuário ausente/inválido ou arquivo não enviado.
- `413 Payload Too Large`: arquivo excede `MAX_FILE_SIZE_BYTES`.
- `500 Internal Server Error`: falha inesperada ao armazenar o arquivo ou registrar metadados.

Se não for possível registrar os metadados após gravar o arquivo, o fluxo deve tentar remover o arquivo recém-criado para evitar um órfão.

### `GET /documents`

Lista documentos do usuário identificado.

**Entrada**

- Header obrigatório: `X-User-Id`

**Sucesso — `200 OK`**

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 153600,
      "uploadedAt": "2026-11-10T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

A lista deve estar ordenada por `uploadedAt` decrescente. Sem documentos, a resposta continua sendo `200 OK` e `documents` é um array vazio.

**Erros**

- `400 Bad Request`: header de usuário ausente ou inválido.
- `500 Internal Server Error`: falha inesperada ao consultar os metadados.

### `GET /documents/:id/download`

Retorna o conteúdo binário de um documento associado ao usuário.

**Entrada**

- Parâmetro de rota: `id`.
- Header obrigatório: `X-User-Id`.

**Sucesso — `200 OK`**

- Corpo binário do arquivo.
- `Content-Disposition: attachment`, com o nome original como nome sugerido para o download.

**Erros**

- `400 Bad Request`: header de usuário ausente/inválido ou identificador inválido.
- `404 Not Found`: documento inexistente, associado a outro usuário ou arquivo ausente no disco.
- `500 Internal Server Error`: falha inesperada ao ler ou transmitir o arquivo.

A API deve responder da mesma forma para documento inexistente e documento pertencente a outro usuário, sem revelar a existência de documentos de terceiros.

### `GET /health`

**Sucesso — `200 OK`**

```json
{
  "status": "ok"
}
```

## 7. Decisões arquiteturais

- **Routes:** declaram endpoints, associam middleware HTTP, quando aplicável, e delegam aos controllers.
- **Controllers:** validam a entrada HTTP, invocam services e convertem resultados e falhas em respostas HTTP.
- **Services:** concentram regras de upload, associação ao usuário, ordenação e autorização de acesso por propriedade.
- **Repositories:** encapsulam o acesso aos metadados em memória e às operações sobre arquivos locais.
- **Multer:** configura `diskStorage`; o nome físico do arquivo é gerado pelo servidor e o nome original fica somente nos metadados.
- **Frontend:** usa componentes funcionais React e um serviço baseado em `fetch` para chamar a API pelo prefixo `/api`.
- **Testes:** usam `node:test`; testes de upload devem usar diretório temporário configurável, evitando dependência de arquivos persistentes em `backend/storage`.

## 8. Riscos e limitações conhecidas

- Metadados em memória são perdidos ao reiniciar o backend; arquivos locais podem permanecer no disco sem registro correspondente.
- `X-User-Id` não autentica usuários. A troca por autenticação real fica para uma etapa futura e exige decisão de produto e segurança.
- O limite de 10 MiB é uma proposta inicial e deve ser validado antes da implementação.
- A limpeza de arquivos órfãos preexistentes e a reconciliação após reinício não fazem parte do escopo inicial.

## 9. Plano de execução

As etapas abaixo descrevem a ordem de implementação futura. Este documento não executa nem cria arquivos de implementação de backend ou frontend.

1. **Confirmar decisões e contratos:** validar limite de upload, identificação por `X-User-Id`, formato de erros e critérios de propriedade.
2. **Implementar persistência local e repositórios:** configurar `diskStorage`, diretório local e repositório em memória para metadados, incluindo tratamento de falha parcial.
3. **Implementar regras, controllers e rotas do backend:** criar o fluxo de upload, listagem e download conforme os contratos, mantendo `/health`.
4. **Adicionar testes do backend:** validar uploads válidos e inválidos, limite de tamanho, isolamento por usuário, listagem, download e falhas de persistência/leitura.
5. **Construir a interface do frontend:** implementar seleção e envio de arquivo, listagem, download e estados de carregamento, sucesso e erro, consumindo `/api`.
6. **Validar integração:** executar testes automatizados e verificar o fluxo completo pelo proxy do Vite com o backend, confirmando a configuração por variáveis de ambiente.
