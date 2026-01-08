/**
 * Contact Form Component
 * Design Philosophy: Agricultural Technology Modernism
 * - Clean, professional form with validation
 * - Green primary color with orange accents
 * - Smooth interactions and feedback
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    type: "demo" // "demo" or "info"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate form submission (in production, this would send to a backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Merci ! Votre message a été envoyé avec succès. Nous vous répondrons bientôt.");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        type: "demo"
      });
    } catch (error) {
      toast.error("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors" style={{ borderColor: formData.type === "demo" ? "#00A651" : undefined }}>
          <input
            type="radio"
            name="type"
            value="demo"
            checked={formData.type === "demo"}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <span className="font-semibold text-foreground">Demander une Démo</span>
        </label>
        <label className="flex items-center gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors" style={{ borderColor: formData.type === "info" ? "#00A651" : undefined }}>
          <input
            type="radio"
            name="type"
            value="info"
            checked={formData.type === "info"}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <span className="font-semibold text-foreground">Demander des Infos</span>
        </label>
      </div>

      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
          Nom Complet *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Votre nom"
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-secondary/50"
            required
          />
        </div>
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
          Adresse Email *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-secondary/50"
            required
          />
        </div>
      </div>

      {/* Phone Field */}
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
          Téléphone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+226 XX XX XX XX"
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-secondary/50"
          />
        </div>
      </div>

      {/* Subject Field */}
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-foreground mb-2">
          Sujet
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Ex: Questions sur les fonctionnalités"
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-secondary/50"
        />
      </div>

      {/* Message Field */}
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-2">
          Message *
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Décrivez votre demande..."
            rows={5}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-secondary/50 resize-none"
            required
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 transition-all"
      >
        {isSubmitting ? "Envoi en cours..." : "Envoyer mon Message"}
      </Button>

      {/* Privacy Notice */}
      <p className="text-xs text-muted-foreground text-center">
        Nous respectons votre confidentialité. Vos données ne seront jamais partagées avec des tiers.
      </p>
    </form>
  );
}
