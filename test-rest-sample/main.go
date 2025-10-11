package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    r := gin.Default()

    // Go Gin framework endpoints
    r.GET("/api/items", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"items": []string{}})
    })

    r.POST("/api/items", func(c *gin.Context) {
        c.JSON(http.StatusCreated, gin.H{"message": "Item created"})
    })

    r.GET("/api/items/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{"item": gin.H{"id": id}})
    })

    r.PUT("/api/items/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{"message": "Item " + id + " updated"})
    })

    r.DELETE("/api/items/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{"message": "Item " + id + " deleted"})
    })

    r.Run(":8080")
}