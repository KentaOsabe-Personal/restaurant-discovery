FROM ruby:4.0.1-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      default-mysql-client \
      default-libmysqlclient-dev \
      git \
      libyaml-dev \
      pkg-config \
      curl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

WORKDIR /rails

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["entrypoint.sh"]
CMD ["rails", "server", "-b", "0.0.0.0"]
