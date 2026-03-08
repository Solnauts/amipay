FROM nginx:alpine

# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/

# Certs are mounted via docker-compose volume, not baked in
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
