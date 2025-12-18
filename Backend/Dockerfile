# ---------- Build stage ----------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Pre-fetch dependencies for better layer caching
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN mvn -B -ntp dependency:go-offline

# Build the application
COPY src ./src
RUN mvn -B -ntp clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
