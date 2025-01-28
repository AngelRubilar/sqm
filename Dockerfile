FROM debian:stable-slim

# Instala dependencias básicas y Bun 1.2
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://bun.sh/install | bash

# Agrega Bun al PATH
ENV PATH="/root/.bun/bin:$PATH"

# Define el directorio de trabajo
WORKDIR /usr/src/app

# Copia e instala dependencias con Bun
COPY package*.json ./
RUN bun install

# Copia el resto de la aplicación
COPY src ./src

# Expone el puerto
EXPOSE 3000

# Ejecuta la aplicación con Bun
CMD ["bun", "src/app.ts"]