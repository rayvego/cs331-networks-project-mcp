FROM ubuntu:22.04

# Install dependencies in a single layer
RUN apt-get update && apt-get install -y \
    curl unzip python3 python3-pip dnsutils iputils-ping traceroute \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
    && mv /root/.bun/bin/bun /usr/local/bin/bun

# Install jc for JSON parsing
RUN pip3 install --no-cache-dir jc

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install Node.js dependencies
RUN bun install

CMD ["bun", "run", "src/index.ts"]