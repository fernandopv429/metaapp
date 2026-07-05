# Imagem oficial leve otimizada para produção
FROM python:3.11-slim

# Configurações de ambiente Python para otimização e logs em tempo real
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Instalação de dependências do SO necessárias para compilação (asyncpg/psycopg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Definição do diretório de trabalho
WORKDIR /app

# Otimização de Cache do Docker (Copia apenas os requirements primeiro)
COPY requirements.txt .

# Instalação das dependências Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Cópia do restante do código-fonte para o container
COPY . .

# Exposição explícita da porta interna exigida pelo Coolify/FastAPI
EXPOSE 8000

# Execução do Uvicorn escutando em 0.0.0.0 (Mandatório para o Proxy Reverso)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
