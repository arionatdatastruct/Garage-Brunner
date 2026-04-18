export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arbeitsrapporte: {
        Row: {
          ampel_status: string | null
          arbeit_beschreibung: string | null
          arbeitszeit_stunden: number | null
          auftragsnummer: string | null
          auftragswert_chf: number | null
          created_at: string
          datum: string | null
          fahrzeug_id: string | null
          fotos: string[] | null
          geplantes_datum: string
          id: string
          kategorie: string | null
          km_stand: number | null
          material_liste: Json | null
          mechaniker: string | null
          mechaniker_zuweisung:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          mfk_datum: string | null
          naechster_service_datum: string | null
          naechster_service_km: number | null
          notizen: string | null
          pdf_url: string | null
          rapport_nummer: string | null
          reifen_zustand: string | null
          sicherheitscheck: Json | null
          status: Database["public"]["Enums"]["rapport_status"]
          updated_at: string
        }
        Insert: {
          ampel_status?: string | null
          arbeit_beschreibung?: string | null
          arbeitszeit_stunden?: number | null
          auftragsnummer?: string | null
          auftragswert_chf?: number | null
          created_at?: string
          datum?: string | null
          fahrzeug_id?: string | null
          fotos?: string[] | null
          geplantes_datum?: string
          id?: string
          kategorie?: string | null
          km_stand?: number | null
          material_liste?: Json | null
          mechaniker?: string | null
          mechaniker_zuweisung?:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          mfk_datum?: string | null
          naechster_service_datum?: string | null
          naechster_service_km?: number | null
          notizen?: string | null
          pdf_url?: string | null
          rapport_nummer?: string | null
          reifen_zustand?: string | null
          sicherheitscheck?: Json | null
          status?: Database["public"]["Enums"]["rapport_status"]
          updated_at?: string
        }
        Update: {
          ampel_status?: string | null
          arbeit_beschreibung?: string | null
          arbeitszeit_stunden?: number | null
          auftragsnummer?: string | null
          auftragswert_chf?: number | null
          created_at?: string
          datum?: string | null
          fahrzeug_id?: string | null
          fotos?: string[] | null
          geplantes_datum?: string
          id?: string
          kategorie?: string | null
          km_stand?: number | null
          material_liste?: Json | null
          mechaniker?: string | null
          mechaniker_zuweisung?:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          mfk_datum?: string | null
          naechster_service_datum?: string | null
          naechster_service_km?: number | null
          notizen?: string | null
          pdf_url?: string | null
          rapport_nummer?: string | null
          reifen_zustand?: string | null
          sicherheitscheck?: Json | null
          status?: Database["public"]["Enums"]["rapport_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbeitsrapporte_fahrzeug_id_fkey"
            columns: ["fahrzeug_id"]
            isOneToOne: false
            referencedRelation: "fahrzeuge"
            referencedColumns: ["id"]
          },
        ]
      }
      fahrzeuge: {
        Row: {
          created_at: string
          id: string
          jahrgang: string | null
          kennzeichen: string
          kunde_id: string | null
          marke: string | null
          modell: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jahrgang?: string | null
          kennzeichen: string
          kunde_id?: string | null
          marke?: string | null
          modell?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jahrgang?: string | null
          kennzeichen?: string
          kunde_id?: string | null
          marke?: string | null
          modell?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fahrzeuge_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          telefon: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          telefon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      mechaniker_name: "Roman" | "Pascal"
      rapport_status: "geplant" | "in_arbeit" | "erledigt" | "archiviert"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      mechaniker_name: ["Roman", "Pascal"],
      rapport_status: ["geplant", "in_arbeit", "erledigt", "archiviert"],
    },
  },
} as const
