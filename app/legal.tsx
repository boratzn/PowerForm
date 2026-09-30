import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../src/components/ui';
import { useLanguageStore } from '../src/stores/useLanguageStore';
import type { Language } from '../src/lib/i18n';

const LEGAL_CONTENT: Record<
  Language,
  {
    headerTitle: string;
    closeBtn: string;
    disclaimerTab: string;
    privacyTab: string;
    disclaimer: {
      cardTitle: string;
      cardDesc: string;
      sec1Title: string;
      sec1Desc: string;
      sec2Title: string;
      sec2Desc: string;
      sec2Bullets: string[];
      sec3Title: string;
      sec3Desc: string;
    };
    privacy: {
      cardTitle: string;
      cardDesc: string;
      sec1Title: string;
      sec1Desc: string;
      sec2Title: string;
      personalDataLabel: string;
      personalDataDesc: string;
      healthDataLabel: string;
      healthDataDesc: string;
      sec3Title: string;
      sec3Desc: string;
      sec3Bullets: { label?: string; text: string }[];
      sec4Title: string;
      sec4Desc: string;
    };
  }
> = {
  tr: {
    headerTitle: 'Yasal ve Gizlilik',
    closeBtn: 'Kapat',
    disclaimerTab: 'Sağlık Sorumluluk Reddi',
    privacyTab: 'KVKK & Gizlilik',
    disclaimer: {
      cardTitle: 'Önemli Tıbbi Uyarı',
      cardDesc:
        'Bu uygulama yalnızca genel bilgilendirme, antrenman loglama ve kişisel takip amaçlıdır; kesinlikle tıbbi tavsiye, teşhis veya tedavi yerine geçmez.',
      sec1Title: '1. Egzersiz ve Fiziksel Aktivite',
      sec1Desc:
        'Yeni bir egzersiz programına başlamadan veya ağırlık artışına gitmeden önce mutlaka alanında uzman bir hekime danışınız. Egzersiz sırasında şiddetli ağrı, baş dönmesi, göz kararması, nefes darlığı veya göğüs rahatsızlığı hissederseniz egzersizi derhal durdurun ve en yakın acil tıbbi servise başvurun.',
      sec2Title: '2. Beslenme ve Kalori Takibi Politikası',
      sec2Desc:
        'Powerform, sağlıklı ve sürdürülebilir beslenme ilkelerine bağlıdır. Bilimsel kriterler ve kullanıcı sağlığını koruma protokolümüz gereğince:',
      sec2Bullets: [
        'Kadın kullanıcılar için 1.200 kcal, erkek kullanıcılar için 1.500 kcal altındaki aşırı kısıtlayıcı kalori hedeflerine izin verilmez.',
        '18 yaş altındaki kullanıcılar için kalori açığı veya kilo kaybı hedefi önerilmez ve otomatik olarak uygulanmaz.',
        "Haftalık vücut ağırlığının %1.5'inden daha hızlı kilo kaybı metabolik ve hormonal riskler taşıdığından sistem uyarı üretir.",
      ],
      sec3Title: '3. Yeme Bozukluğu Koruması ve Destek',
      sec3Desc:
        'Beslenme veya beden algısıyla ilgili takıntılı düşünceler, aşırı kısıtlama veya kendini kusturma gibi yeme bozukluğu belirtileri yaşıyorsanız lütfen profesyonel destek almaktan çekinmeyiniz. Türkiye Cumhuriyeti Sağlık Bakanlığı MHRS (182) üzerinden veya bir psikiyatri uzmanından destek alabilirsiniz.',
    },
    privacy: {
      cardTitle: '6698 Sayılı KVKK Aydınlatma Metni',
      cardDesc:
        'Powerform olarak kişisel verilerinizin ve özel nitelikli sağlık verilerinizin güvenliğine azami önem veriyoruz.',
      sec1Title: '1. Veri Sorumlusu ve Saklama Bölgesi',
      sec1Desc:
        'Verileriniz, yerel olarak cihazınızdaki güvenli SQLite veritabanında saklanır. Bulut eşitleme aktif olduğunda verileriniz Avrupa Birliği (Frankfurt, Almanya) bölgesinde bulunan şifreli Supabase altyapısında güvenle muhafaza edilir.',
      sec2Title: '2. İşlenen Veri Kategorileri',
      personalDataLabel: 'Kişisel Veriler:',
      personalDataDesc:
        'E-posta adresi, profil adı, antrenman seans kayıtları, set ve tekrar geçmişi.',
      healthDataLabel: 'Özel Nitelikli Sağlık Verileri:',
      healthDataDesc:
        'Vücut ağırlığı, boy, yaş, tahmini yağ oranı, tüketilen gıda ve besin değerleri.',
      sec3Title: '3. Veri Sahibi Hakları (KVKK md. 11)',
      sec3Desc: 'Kullanıcılarımız her zaman aşağıdaki haklara sahiptir:',
      sec3Bullets: [
        { text: 'Verilerinin işlenip işlenmediğini öğrenme,' },
        {
          label: 'Veri Taşınabilirliği:',
          text: ' Profil ekranından tek tıkla tüm antrenman, kilo ve beslenme geçmişini açık standartta JSON formatında dışa aktarma (export etme),',
        },
        {
          label: 'Unutulma Hakkı (Silme):',
          text: ' Profil ekranından hesabını ve veritabanındaki tüm ilişkili kayıtları kalıcı olarak silme hakkına sahiptir.',
        },
      ],
      sec4Title: '4. Üçüncü Taraflarla Paylaşım',
      sec4Desc:
        'Verileriniz hiçbir koşulda ticari reklam ağlarıyla veya veri komisyoncularıyla paylaşılmaz ve satılmaz.',
    },
  },
  en: {
    headerTitle: 'Legal & Privacy',
    closeBtn: 'Close',
    disclaimerTab: 'Health Disclaimer',
    privacyTab: 'Privacy & GDPR',
    disclaimer: {
      cardTitle: 'Important Medical Disclaimer',
      cardDesc:
        'This application is for informational, workout tracking, and personal fitness monitoring purposes only. It is not intended as medical advice, diagnosis, or treatment.',
      sec1Title: '1. Exercise and Physical Activity',
      sec1Desc:
        'Always consult a qualified physician or healthcare professional before beginning any new exercise routine or increasing weights. If you experience severe pain, dizziness, lightheadedness, shortness of breath, or chest discomfort during physical activity, stop immediately and seek emergency medical care.',
      sec2Title: '2. Nutrition and Calorie Tracking Policy',
      sec2Desc:
        'Powerform is strictly committed to healthy, sustainable nutrition practices. In accordance with clinical evidence and user safety standards:',
      sec2Bullets: [
        'Severely restrictive caloric goals below 1,200 kcal for women and 1,500 kcal for men are strictly prohibited.',
        'Caloric deficits or intentional weight loss targets are neither recommended nor automated for users under the age of 18.',
        'Weight loss exceeding 1.5% of total body weight per week carries metabolic and endocrine risks; our system alerts users accordingly.',
      ],
      sec3Title: '3. Eating Disorder Protection and Support',
      sec3Desc:
        'If you are struggling with obsessive thoughts regarding food, extreme restriction, or disordered eating behaviors, please reach out for professional help. You can contact your local health service or eating disorder helpline.',
    },
    privacy: {
      cardTitle: 'Privacy Policy & Data Protection (GDPR)',
      cardDesc:
        'At Powerform, we treat the confidentiality and protection of your personal and health data with the utmost priority.',
      sec1Title: '1. Data Controller and Storage Location',
      sec1Desc:
        'Your data is stored locally within a secure SQLite database on your device. When cloud sync is active, records are securely transmitted and encrypted within the European Union (Frankfurt, Germany) using Supabase infrastructure.',
      sec2Title: '2. Categories of Processed Data',
      personalDataLabel: 'Personal Data:',
      personalDataDesc:
        'Email address, profile display name, workout logs, completed sets, reps, and exercise volume.',
      healthDataLabel: 'Sensitive Health Data:',
      healthDataDesc:
        'Body weight, height, birth year, estimated body fat percentage, dietary intake, and macro nutrients.',
      sec3Title: '3. User Rights under GDPR',
      sec3Desc: 'You retain full control over your data at all times:',
      sec3Bullets: [
        { text: 'Right to be informed and access all recorded personal data,' },
        {
          label: 'Data Portability:',
          text: ' One-tap export of your complete training, weight, and nutrition history in open JSON format from the Profile tab,',
        },
        {
          label: 'Right to Erasure (To be Forgotten):',
          text: ' Permanent deletion of your user account and all connected records from our cloud database with a single action.',
        },
      ],
      sec4Title: '4. Third-Party Sharing and Sale of Data',
      sec4Desc:
        'Your data is never sold, leased, or shared with commercial advertising networks or data brokers under any circumstances.',
    },
  },
  de: {
    headerTitle: 'Rechtliches & Datenschutz',
    closeBtn: 'Schließen',
    disclaimerTab: 'Gesundheitshinweis',
    privacyTab: 'Datenschutz & DSGVO',
    disclaimer: {
      cardTitle: 'Wichtiger medizinischer Hinweis',
      cardDesc:
        'Diese App dient ausschließlich allgemeinen Informations-, Trainingsprotokollierungs- und persönlichen Tracking-Zwecken; sie ersetzt keinen medizinischen Rat, keine Diagnose und keine Behandlung.',
      sec1Title: '1. Training und körperliche Betätigung',
      sec1Desc:
        'Konsultieren Sie einen qualifizierten Arzt, bevor Sie ein neues Trainingsprogramm beginnen oder Gewichte steigern. Brechen Sie das Training sofort ab und suchen Sie den Notarzt auf, falls starke Schmerzen, Schwindel, Atemnot oder Brustbeschwerden auftreten.',
      sec2Title: '2. Richtlinie für Ernährung und Kalorientracking',
      sec2Desc:
        'Powerform verpflichtet sich gesunden und nachhaltigen Ernährungsprinzipien. Zum Schutz der Nutzergesundheit gilt:',
      sec2Bullets: [
        'Extrem restriktive Kalorienziele unter 1.200 kcal für Frauen und 1.500 kcal für Männer sind nicht gestattet.',
        'Kaloriendefizite oder Gewichtsverlustziele werden für Personen unter 18 Jahren weder empfohlen noch angewendet.',
        'Ein Gewichtsverlust von über 1,5 % des Körpergewichts pro Woche birgt gesundheitliche Risiken und löst automatische Warnungen aus.',
      ],
      sec3Title: '3. Schutz vor Essstörungen & Hilfsangebote',
      sec3Desc:
        'Wenn Sie unter obsessiven Gedanken bezüglich Ernährung oder Körperbild leiden, zögern Sie bitte nicht, professionelle psychologische oder ärztliche Hilfe in Anspruch zu nehmen.',
    },
    privacy: {
      cardTitle: 'Datenschutzerklärung gemäß DSGVO',
      cardDesc:
        'Der Schutz und die Sicherheit Ihrer personenbezogenen Daten und Gesundheitsdaten haben für Powerform höchste Priorität.',
      sec1Title: '1. Verantwortlicher & Speicherort',
      sec1Desc:
        'Ihre Daten werden lokal in einer sicheren SQLite-Datenbank auf Ihrem Gerät gespeichert. Bei aktiver Cloud-Synchronisierung werden Ihre Daten verschlüsselt in Rechenzentren der Europäischen Union (Frankfurt, Deutschland) über Supabase gespeichert.',
      sec2Title: '2. Verarbeitete Datenkategorien',
      personalDataLabel: 'Personenbezogene Daten:',
      personalDataDesc:
        'E-Mail-Adresse, Profilname, Trainingsprotokolle, Sätze und Wiederholungen.',
      healthDataLabel: 'Besondere Kategorien (Gesundheitsdaten):',
      healthDataDesc:
        'Körpergewicht, Größe, Alter, geschätzter Körperfettanteil sowie Ernährungsprotokolle.',
      sec3Title: '3. Betroffenenrechte nach DSGVO',
      sec3Desc: 'Als Nutzer haben Sie jederzeit das Recht auf:',
      sec3Bullets: [
        { text: 'Auskunft über Ihre gespeicherten Daten,' },
        {
          label: 'Datenübertragbarkeit:',
          text: ' Vollständiger Export Ihres Trainings- und Ernährungsverlaufs im offenen JSON-Format direkt im Profil,',
        },
        {
          label: 'Recht auf Löschung:',
          text: ' Unwiderrufliches Löschen Ihres Kontos und aller zugehörigen Datenbankeinträge.',
        },
      ],
      sec4Title: '4. Weitergabe an Dritte',
      sec4Desc:
        'Ihre Daten werden unter keinen Umständen an Werbenetzwerke oder Datenhändler verkauft oder weitergegeben.',
    },
  },
  es: {
    headerTitle: 'Legal y Privacidad',
    closeBtn: 'Cerrar',
    disclaimerTab: 'Descargo Médico',
    privacyTab: 'Privacidad y RGPD',
    disclaimer: {
      cardTitle: 'Aviso Médico Importante',
      cardDesc:
        'Esta aplicación está destinada únicamente a fines informativos, de registro de entrenamientos y seguimiento personal; de ninguna manera sustituye el asesoramiento, diagnóstico o tratamiento médico.',
      sec1Title: '1. Ejercicio y Actividad Física',
      sec1Desc:
        'Consulte siempre con un médico antes de iniciar una nueva rutina de ejercicios o aumentar las cargas. Si siente dolor agudo, mareos, dificultad para respirar o molestias en el pecho durante el entrenamiento, deténgase inmediatamente y solicite atención médica de urgencia.',
      sec2Title: '2. Política de Nutrición y Conteo de Calorías',
      sec2Desc:
        'Powerform promueve una nutrición saludable y sostenible. De acuerdo con estándares científicos de protección al usuario:',
      sec2Bullets: [
        'No se permiten metas calóricas excesivamente restrictivas por debajo de 1.200 kcal para mujeres y 1.500 kcal para hombres.',
        'No se recomiendan ni aplican automáticamente déficits calóricos para menores de 18 años.',
        'Pérdidas de peso superiores al 1,5% del peso corporal semanal generan advertencias de seguridad debido a riesgos metabólicos.',
      ],
      sec3Title: '3. Prevención de Trastornos de la Conducta Alimentaria',
      sec3Desc:
        'Si experimenta pensamientos obsesivos con la comida, restricción extrema o conductas de purga, no dude en acudir a profesionales de la salud médica o psicológica.',
    },
    privacy: {
      cardTitle: 'Política de Privacidad y RGPD',
      cardDesc:
        'En Powerform la seguridad y privacidad de sus datos personales y de salud son nuestra máxima prioridad.',
      sec1Title: '1. Responsable del Tratamiento y Servidores',
      sec1Desc:
        'Sus datos se almacenan localmente en la base de datos segura SQLite de su dispositivo. Con la sincronización activa, se resguardan de forma cifrada en servidores de la Unión Europea (Fráncfort, Alemania) mediante Supabase.',
      sec2Title: '2. Categorías de Datos Tratados',
      personalDataLabel: 'Datos Personales:',
      personalDataDesc:
        'Correo electrónico, nombre de perfil, registros de sesiones, series y repeticiones.',
      healthDataLabel: 'Datos Sensibles de Salud:',
      healthDataDesc:
        'Peso corporal, altura, edad, porcentaje de grasa estimado y registros de nutrición.',
      sec3Title: '3. Derechos del Usuario (RGPD)',
      sec3Desc: 'Usted tiene derecho en cualquier momento a:',
      sec3Bullets: [
        { text: 'Conocer si sus datos están siendo tratados,' },
        {
          label: 'Portabilidad de Datos:',
          text: ' Exportar con un toque todo su historial en formato estándar JSON desde la pantalla de perfil,',
        },
        {
          label: 'Derecho de Supresión (Olvido):',
          text: ' Eliminar permanentemente su cuenta y todos sus registros asociados.',
        },
      ],
      sec4Title: '4. Cesión a Terceros',
      sec4Desc:
        'Bajo ninguna circunstancia sus datos son vendidos ni compartidos con empresas de publicidad o intermediarios de datos.',
    },
  },
};

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'kvkk'>('disclaimer');

  const content = LEGAL_CONTENT[language] ?? LEGAL_CONTENT.tr;

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-bg-elevated px-md py-sm">
        <Text className="text-lg font-bold text-text-primary">{content.headerTitle}</Text>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          className="rounded-full bg-bg-surface px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-text-muted">{content.closeBtn}</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-bg-elevated bg-bg-surface/50 p-xs gap-xs">
        <Pressable
          onPress={() => setActiveTab('disclaimer')}
          className={`flex-1 items-center justify-center rounded-md py-2 ${
            activeTab === 'disclaimer' ? 'bg-bg-elevated' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'disclaimer' ? 'text-accent' : 'text-text-muted'
            }`}
          >
            {content.disclaimerTab}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('kvkk')}
          className={`flex-1 items-center justify-center rounded-md py-2 ${
            activeTab === 'kvkk' ? 'bg-bg-elevated' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'kvkk' ? 'text-accent' : 'text-text-muted'
            }`}
          >
            {content.privacyTab}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-md py-md"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'disclaimer' ? (
          <View className="gap-md">
            <Card className="border-warning/30 bg-warning/5 p-md gap-xs">
              <Text className="text-xs font-bold uppercase tracking-wider text-warning">
                {content.disclaimer.cardTitle}
              </Text>
              <Text className="text-sm leading-relaxed text-text-primary">
                {content.disclaimer.cardDesc}
              </Text>
            </Card>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.disclaimer.sec1Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.disclaimer.sec1Desc}
              </Text>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.disclaimer.sec2Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.disclaimer.sec2Desc}
              </Text>
              <View className="ml-sm gap-xs mt-1">
                {content.disclaimer.sec2Bullets.map((bullet, idx) => (
                  <Text key={idx} className="text-xs text-text-muted">
                    • {bullet}
                  </Text>
                ))}
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.disclaimer.sec3Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.disclaimer.sec3Desc}
              </Text>
            </View>
          </View>
        ) : (
          <View className="gap-md">
            <Card className="border-accent/30 bg-accent/5 p-md gap-xs">
              <Text className="text-xs font-bold uppercase tracking-wider text-accent">
                {content.privacy.cardTitle}
              </Text>
              <Text className="text-xs leading-relaxed text-text-primary">
                {content.privacy.cardDesc}
              </Text>
            </Card>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.privacy.sec1Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.privacy.sec1Desc}
              </Text>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.privacy.sec2Title}
              </Text>
              <View className="ml-sm gap-xs mt-1">
                <Text className="text-xs text-text-muted">
                  •{' '}
                  <Text className="font-semibold text-text-primary">
                    {content.privacy.personalDataLabel}
                  </Text>{' '}
                  {content.privacy.personalDataDesc}
                </Text>
                <Text className="text-xs text-text-muted">
                  •{' '}
                  <Text className="font-semibold text-text-primary">
                    {content.privacy.healthDataLabel}
                  </Text>{' '}
                  {content.privacy.healthDataDesc}
                </Text>
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.privacy.sec3Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.privacy.sec3Desc}
              </Text>
              <View className="ml-sm gap-xs mt-1">
                {content.privacy.sec3Bullets.map((item, idx) => (
                  <Text key={idx} className="text-xs text-text-muted">
                    •{' '}
                    {item.label && (
                      <Text className="font-semibold text-text-primary">{item.label}</Text>
                    )}
                    {item.text}
                  </Text>
                ))}
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                {content.privacy.sec4Title}
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                {content.privacy.sec4Desc}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
