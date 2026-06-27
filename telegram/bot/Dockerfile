FROM python:3.12-slim

# Не писать .pyc, логи сразу в stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py texts.py storage.py pdf.py ./
COPY fonts ./fonts

# Токен передаётся при запуске: docker run --env-file .env ...
# Данные заявок — в DATA_DIR (на Railway смонтировать Volume, напр. /data)
CMD ["python", "bot.py"]
