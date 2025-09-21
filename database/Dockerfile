# Use the official PostgreSQL image from Docker Hub
FROM postgres:lts-alpine

# Set environment variables for default user, password, and database
ENV POSTGRES_USER=root
ENV POSTGRES_PASSWORD=root
ENV POSTGRES_DB=mydatabase

# Expose PostgreSQL port
EXPOSE 5432

# Optional: Add initialization scripts
# COPY ./init.sql /docker-entrypoint-initdb.d/

# No additional commands needed; the official image handles startup