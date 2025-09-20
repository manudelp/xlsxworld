# Use the official PostgreSQL image from Docker Hub
FROM postgres:lts-alpine

# Set environment variables for default user, password, and database
ENV POSTGRES_USER=manu
ENV POSTGRES_PASSWORD=manu
ENV POSTGRES_DB=xlsxworld

# Expose PostgreSQL port
EXPOSE 5432

# Optional: Add initialization scripts
# COPY ./init.sql /docker-entrypoint-initdb.d/

# No additional commands needed; the official image handles startup