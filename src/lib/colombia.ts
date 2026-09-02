export interface Department {
  name: string;
  municipalities: string[];
}

export const COLOMBIA_DEPARTMENTS: Department[] = [
  {
    name: "Amazonas",
    municipalities: ["Leticia", "Puerto Nariño", "El Encanto", "La Chorrera", "Puerto Santander", "Tarapacá"],
  },
  {
    name: "Antioquia",
    municipalities: [
      "Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "Rionegro", "Apartadó", "Turbo",
      "Caucasia", "Yarumal", "Santa Fe de Antioquia", "Amagá", "Marinilla", "La Ceja", "Copacabana",
      "Girardota", "Barbosa", "Segovia", "Remedios", "Puerto Berrío", "Carepa", "Chigorodó",
    ],
  },
  {
    name: "Arauca",
    municipalities: ["Arauca", "Arauquita", "Saravena", "Tame", "Fortul", "Cravo Norte"],
  },
  {
    name: "Atlántico",
    municipalities: [
      "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Galapa", "Puerto Colombia", "Baranoa",
      "Santo Tomás", "Sabanagrande", "Juan de Acosta",
    ],
  },
  {
    name: "Bolívar",
    municipalities: [
      "Cartagena", "Magangué", "Turbaco", "Arjona", "Mompox", "El Carmen de Bolívar", "María La Baja",
      "Achí", "Calamar", "San Juan Nepomuceno", "Carmen de Bolívar", "Maganqué",
    ],
  },
  {
    name: "Boyacá",
    municipalities: [
      "Tunja", "Duitama", "Sogamoso", "Paipa", "Chiquinquirá", "Moniquirá", "Villa de Leyva", "Puerto Boyacá",
      "Ramiriquí", "Socotá", "Garagoa",
    ],
  },
  {
    name: "Caldas",
    municipalities: [
      "Manizales", "Villamaría", "Chinchiná", "Neira", "Riosucio", "La Dorada", "Salamina", "Pensilvania", "Manzanares",
    ],
  },
  {
    name: "Caquetá",
    municipalities: ["Florencia", "San Vicente del Caguán", "Puerto Rico", "Curillo", "El Paujil", "Belén de los Andaquíes"],
  },
  {
    name: "Casanare",
    municipalities: ["Yopal", "Aguazul", "Villanueva", "Tauramena", "Paz de Ariporo", "Trinidad", "Monterrey"],
  },
  {
    name: "Cauca",
    municipalities: [
      "Popayán", "Santander de Quilichao", "Puerto Tejada", "Guachené", "Cajibío", "El Tambo", "Patía",
      "Silvia", "Piendamó", "Miranda",
    ],
  },
  {
    name: "Cesar",
    municipalities: [
      "Valledupar", "Aguachica", "La Paz", "Codazzi", "San Diego", "Curumaní", "Pueblo Bello", "Gamarra",
    ],
  },
  {
    name: "Chocó",
    municipalities: ["Quibdó", "Istmina", "Condoto", "Tadó", "Nuquí", "Bahía Solano", "Riosucio", "Carmen del Darién"],
  },
  {
    name: "Córdoba",
    municipalities: [
      "Montería", "Cereté", "Sahagún", "Lorica", "Tierralta", "Ciénaga de Oro", "Montelíbano", "Planeta Rica",
      "San Antero", "Puerto Escondido",
    ],
  },
  {
    name: "Cundinamarca",
    municipalities: [
      "Bogotá D.C.", "Soacha", "Chía", "Zipaquirá", "Facatativá", "Girardot", "Mosquera", "Madrid", "Funza",
      "Cajicá", "Sopó", "La Calera", "Fusagasugá", "Ubaté", "Cota", "Tocancipá", "Gachancipá", "Villeta",
    ],
  },
  {
    name: "Guainía",
    municipalities: ["Inírida", "Barrancominas", "Cacahual", "La Guadalupe", "Mapiripana"],
  },
  {
    name: "Guaviare",
    municipalities: ["San José del Guaviare", "Calamar", "El Retorno", "Miraflores"],
  },
  {
    name: "Huila",
    municipalities: [
      "Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre", "Rivera", "Palermo", "Gigante", "Aipe",
    ],
  },
  {
    name: "La Guajira",
    municipalities: ["Riohacha", "Maicao", "Uribia", "San Juan del Cesar", "Fonseca", "Villanueva", "Manaure", "Albania"],
  },
  {
    name: "Magdalena",
    municipalities: [
      "Santa Marta", "Ciénaga", "Fundación", "El Banco", "Aracataca", "Pivijay", "Plato", "Zona Bananera", "Pueblo Viejo",
    ],
  },
  {
    name: "Meta",
    municipalities: [
      "Villavicencio", "Acacías", "Granada", "Puerto López", "San Martín", "Restrepo", "Cumaral", "Puerto Gaitán", "Villanueva",
    ],
  },
  {
    name: "Nariño",
    municipalities: [
      "Pasto", "Ipiales", "Tumaco", "Túquerres", "Barbacoas", "La Unión", "San Juan de Pasto", "Samaniego",
      "El Charco", "Sandona",
    ],
  },
  {
    name: "Norte de Santander",
    municipalities: ["Cúcuta", "Ocaña", "Villa del Rosario", "Los Patios", "Pamplona", "Chinácota", "El Zulia", "Tibú"],
  },
  {
    name: "Putumayo",
    municipalities: ["Mocoa", "Puerto Asís", "Orito", "La Dorada", "Valle del Guamuez", "Sibundoy", "Puerto Caicedo"],
  },
  {
    name: "Quindío",
    municipalities: ["Armenia", "Calarcá", "Montenegro", "La Tebaida", "Quimbaya", "Salento", "Circasia", "Buenavista"],
  },
  {
    name: "Risaralda",
    municipalities: ["Pereira", "Dosquebradas", "La Virginia", "Santa Rosa de Cabal", "Belén de Umbría", "Quinchía", "Apía", "Marsella"],
  },
  {
    name: "San Andrés y Providencia",
    municipalities: ["San Andrés", "Providencia"],
  },
  {
    name: "Santander",
    municipalities: [
      "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro",
      "Vélez", "Lebrija", "Cúcuta", "Ocaña", "Puerto Wilches",
    ],
  },
  {
    name: "Sucre",
    municipalities: ["Sincelejo", "Corozal", "Tolú", "Sampués", "Morroa", "San Marcos", "San Onofre", "Ovejas"],
  },
  {
    name: "Tolima",
    municipalities: [
      "Ibagué", "Espinal", "Melgar", "Mariquita", "Chaparral", "Lérida", "Honda", "Líbano", "Flandes", "Rovira",
    ],
  },
  {
    name: "Valle del Cauca",
    municipalities: [
      "Cali", "Palmira", "Buenaventura", "Tuluá", "Yumbo", "Cartago", "Buga", "Jamundí", "Roldanillo",
      "La Unión", "Sevilla", "Candelaria", "Florida", "Guacarí", "Zarzal",
    ],
  },
  {
    name: "Vaupés",
    municipalities: ["Mitú", "Caruru", "Taraira", "Papunaua", "Yavaraté"],
  },
  {
    name: "Vichada",
    municipalities: ["Puerto Carreño", "Cumaribo", "La Primavera", "Santa Rosalía", "San José de Ocune"],
  },
];

export const COLOMBIA_COUNTRY = "Colombia";
